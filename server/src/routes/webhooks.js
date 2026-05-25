import { Router } from 'express';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();
const prisma = new PrismaClient();
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
          console.log(`🔔 Subscription cancelled: ${subscription.id}`);
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
