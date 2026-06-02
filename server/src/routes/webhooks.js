import { Router } from 'express';
import express from 'express';
import prisma from '../lib/prisma.js';
import Stripe from 'stripe';
import { sendEmail } from '../services/email.js';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /api/v1/webhooks/stripe
// Handles Stripe webhook events — needs RAW body (not JSON-parsed)
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      // Verify webhook signature if secret is configured
      if (process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_WEBHOOK_SECRET !== 'whsec_replace_with_your_webhook_secret') {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET
        );
      } else {
        // In development without webhook secret, parse the raw body
        event = JSON.parse(req.body.toString());
        console.warn('⚠️  Webhook signature verification skipped (no STRIPE_WEBHOOK_SECRET configured)');
      }
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    try {
      switch (event.type) {
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object;
          const customerId = invoice.customer;
          const amountPaid = invoice.amount_paid; // in cents

          // Find user by Stripe customer ID
          const user = await prisma.user.findFirst({
            where: { stripeCustomerId: customerId },
          });

          if (user) {
            // Record the transaction
            await prisma.transaction.create({
              data: {
                userId: user.id,
                stripeInvoiceId: invoice.id,
                stripePaymentIntentId: invoice.payment_intent,
                amount: amountPaid,
                status: 'SUCCEEDED',
              },
            });

            console.log(`✅ Payment recorded: $${(amountPaid / 100).toFixed(2)} from ${user.email}`);

            // Acknowledge payment recorded instantly, dispatching receipt and PDF generation in background
            // to ensure strict Stripe HTTP webhook response times under 2 seconds.
            setTimeout(async () => {
              try {
                // Resolve the donor's active tier dynamically using monthlyAmount (already in dollars) or amountPaid (in cents)
                const amountDollars = user.monthlyAmount ? user.monthlyAmount : Math.floor(amountPaid / 100);
                let tierName = 'Supporter';
                let tierPerks = [];

                try {
                  const tier = await prisma.tier.findFirst({
                    where: {
                      minAmount: { lte: amountDollars },
                      OR: [
                        { maxAmount: null },
                        { maxAmount: { gte: amountDollars } },
                      ],
                    },
                    orderBy: { tierLevel: 'desc' },
                  });

                  if (tier) {
                    tierName = tier.name;
                    tierPerks = Array.isArray(tier.perks) ? tier.perks : JSON.parse(tier.perks || '[]');
                  }
                } catch (tierErr) {
                  console.error('Failed to resolve tier for Stripe webhook receipt:', tierErr.message);
                }

                const donorName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Valued Donor';

                // Send Donation Receipt
                await sendEmail({
                  to: user.email,
                  subject: 'Thank you for your donation — Official OMP Receipt 🎉',
                  title: 'Donation Receipt',
                  messageText: `Hi ${user.firstName || 'Donor'}, thank you for your generous support of $${(amountPaid / 100).toFixed(2)}. Your contribution goes directly towards our active projects.`,
                  receiptData: {
                    amount: amountPaid,
                    transactionId: invoice.id,
                    date: new Date().toISOString(),
                    donorName,
                    donorEmail: user.email,
                    country: user.country || 'Not specified',
                    tierName,
                    tierPerks,
                  }
                });
              } catch (bgErr) {
                console.error('❌ Background webhook email dispatch failed:', bgErr.message);
              }
            }, 50);
          } else {
            console.warn(`⚠️  No user found for Stripe customer: ${customerId}`);
          }
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object;
          const customerId = invoice.customer;

          const user = await prisma.user.findFirst({
            where: { stripeCustomerId: customerId },
          });

          if (user) {
            await prisma.transaction.create({
              data: {
                userId: user.id,
                stripeInvoiceId: invoice.id,
                stripePaymentIntentId: invoice.payment_intent,
                amount: invoice.amount_due,
                status: 'FAILED',
              },
            });

            console.log(`❌ Payment failed for ${user.email}`);
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object;
          const customerId = subscription.customer;
          console.log(`🔔 Subscription cancelled: ${subscription.id}`);

          const user = await prisma.user.findFirst({
            where: { stripeCustomerId: customerId },
          });
          if (user) {
            await prisma.user.update({
              where: { id: user.id },
              data: { monthlyAmount: 0 },
            });
            console.log(`🔄 Reset monthlyAmount for ${user.email} due to subscription cancellation.`);
          }
          break;
        }

        default:
          console.log(`ℹ️  Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error('❌ Webhook handler error:', error);
      // Don't return error to Stripe — acknowledge receipt
    }

    // Always return 200 to acknowledge receipt
    res.json({ received: true });
  }
);

export default router;
