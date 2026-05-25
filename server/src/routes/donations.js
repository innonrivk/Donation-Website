import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { upsertStripeCustomer, createStripeSubscription, listActiveSubscriptions } from '../services/stripe.js';

const router = Router();
const prisma = new PrismaClient();

// ── Zod validation schema ──
// Client sends `amount` in DOLLARS. Backend converts to cents before Stripe calls.
const SubscribeSchema = z.object({
  email:           z.string().email('Valid email is required'),
  firstName:       z.string().min(1, 'First name is required').max(80),
  lastName:        z.string().min(1, 'Last name is required').max(80),
  country:         z.string().min(2, 'Please select a country').max(60),
  paymentMethodId: z.string().startsWith('pm_', 'Invalid payment method'),
  amount:          z.number().int().min(1, 'Minimum donation is $1'), // dollars
});

// POST /api/v1/donations/subscribe
// Securely creates a Stripe subscription — all Stripe calls happen server-side.
router.post('/subscribe', async (req, res, next) => {
  try {
    // ── 1. Validate input ──
    const parseResult = SubscribeSchema.safeParse(req.body);
    if (!parseResult.success) {
      const fieldErrors = parseResult.error.flatten().fieldErrors;
      return res.status(400).json({
        error: 'validation_error',
        message: 'Invalid input. Please check the form fields.',
        fields: fieldErrors,
      });
    }

    const { email, firstName, lastName, country, paymentMethodId, amount } = parseResult.data;
    const amountCents = amount * 100;

    // ── 2. Upsert Stripe customer (create or reuse) ──
    // Check if user already exists in our DB
    let user = await prisma.user.findUnique({ where: { email } });
    const existingCustomerId = user?.stripeCustomerId || undefined;

    const customer = await upsertStripeCustomer({
      email,
      name: `${firstName} ${lastName}`,
      paymentMethodId,
      existingCustomerId,
    });

    // ── 3. Duplicate-subscription guard ──
    // Check for an existing active subscription at the exact same amount
    const activeSubs = await listActiveSubscriptions(customer.id);
    const duplicate = activeSubs.find((sub) => {
      const item = sub.items?.data?.[0];
      return item?.price?.unit_amount === amountCents;
    });

    if (duplicate) {
      return res.status(409).json({
        error: 'duplicate_subscription',
        message: `You already have an active $${amount}/month donation. To change your donation amount, please contact support.`,
      });
    }

    // ── 4. Create Stripe subscription ──
    const subscription = await createStripeSubscription({
      customerId: customer.id,
      amountCents,
    });

    // ── 5. Upsert User row + optionally insert Transaction (atomic) ──
    try {
      await prisma.$transaction(async (tx) => {
        // Create or update user
        user = await tx.user.upsert({
          where: { email },
          create: {
            email,
            firstName,
            lastName,
            country,
            stripeCustomerId: customer.id,
            role: 'DONOR',
          },
          update: {
            firstName,
            lastName,
            country,
            stripeCustomerId: customer.id,
          },
        });

        // If subscription is immediately active, record the transaction
        if (subscription.status === 'active') {
          const paymentIntent = subscription.latest_invoice?.payment_intent;
          await tx.transaction.create({
            data: {
              userId: user.id,
              stripePaymentIntentId: paymentIntent?.id || null,
              stripeInvoiceId: subscription.latest_invoice?.id || null,
              amount: amountCents,
              status: 'SUCCEEDED',
            },
          });
        }
      });
    } catch (dbError) {
      // ── DEAD-LETTER LOG ──
      // Stripe charge succeeded but DB write failed. Log structured data
      // for manual reconciliation. The webhook handler in webhooks.js will
      // also insert the Transaction when invoice.payment_succeeded fires,
      // acting as a safety net.
      console.error('🚨 DEAD-LETTER: Stripe succeeded but DB write failed', {
        stripeCustomerId: customer.id,
        stripeSubscriptionId: subscription.id,
        email,
        amountCents,
        dbError: dbError.message,
      });

      // Still return success to the client — their card was charged.
      // The webhook will reconcile the DB record.
    }

    // ── 6. Respond based on subscription status ──
    if (subscription.status === 'active') {
      // Payment completed immediately — no SCA required
      return res.status(201).json({
        success: true,
        subscriptionId: subscription.id,
        status: 'active',
      });
    }

    if (subscription.status === 'incomplete') {
      // SCA / 3D Secure required — send client_secret for confirmation
      const clientSecret =
        subscription.latest_invoice?.payment_intent?.client_secret || null;

      return res.status(202).json({
        success: true,
        subscriptionId: subscription.id,
        clientSecret,
        status: 'requires_action',
      });
    }

    // Unexpected status
    return res.status(200).json({
      success: true,
      subscriptionId: subscription.id,
      status: subscription.status,
    });
  } catch (error) {
    console.error('Subscription error:', error);

    // Stripe-specific card errors → 402 with user-facing message
    if (error.type === 'StripeCardError') {
      return res.status(402).json({
        error: error.code || 'card_error',
        message: error.message,
        field: null,
      });
    }

    // Stripe invalid request (bad PM id, etc.)
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({
        error: 'invalid_request',
        message: 'The payment could not be processed. Please try again.',
        field: null,
      });
    }

    next(error);
  }
});

export default router;
