import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { z } from 'zod';
import { upsertStripeCustomer, createStripeSubscription, listActiveSubscriptions, stripe, isMockMode } from '../services/stripe.js';

const router = Router();

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
    console.log("\n\x1b[35m┌──────────────────────────────────────────────────────────┐\x1b[0m");
    console.log("\x1b[35m│ 📥 [BACKEND] Received subscribe request on /subscribe   │\x1b[0m");
    console.log("\x1b[35m└──────────────────────────────────────────────────────────┘\x1b[0m");

    // ── 1. Validate input ──
    const parseResult = SubscribeSchema.safeParse(req.body);
    if (!parseResult.success) {
      console.log("├── ❌ [BACKEND] Validation failed!");
      const fieldErrors = parseResult.error.flatten().fieldErrors;
      return res.status(400).json({
        error: 'validation_error',
        message: 'Invalid input. Please check the form fields.',
        fields: fieldErrors,
      });
    }

    const { email, firstName, lastName, country, paymentMethodId, amount } = parseResult.data;
    const amountCents = amount * 100;
    console.log(`├── 🔎 [BACKEND] Validation succeeded for: \x1b[36m${email}\x1b[0m (Amount: $${amount}/mo)`);

    // ── 2. Upsert Stripe customer (create or reuse) ──
    // Check if user already exists in our DB
    let user = await prisma.user.findUnique({ where: { email } });
    const existingCustomerId = user?.stripeCustomerId || undefined;
    console.log(`├── 👤 [BACKEND] Checking existing customer (Stripe Customer ID: \x1b[33m${existingCustomerId || 'None'}\x1b[0m)`);

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
      console.log(`├── ⚠️  [BACKEND] Duplicate subscription detected for customer: ${customer.id}`);
      return res.status(409).json({
        error: 'duplicate_subscription',
        message: `You already have an active $${amount}/month donation. To change your donation amount, please contact support.`,
      });
    }

    // Cancel any previous active subscriptions to prevent double-billing
    if (activeSubs.length > 0) {
      console.log(`├── 🧹 [BACKEND] Cancelling ${activeSubs.length} previous active subscription(s) for customer: ${customer.id}`);
      for (const sub of activeSubs) {
        try {
          if (isMockMode) {
            console.log(`├── 🔌 [STRIPE] (Mock) Cancelled sub: ${sub.id}`);
          } else {
            await stripe.subscriptions.cancel(sub.id);
          }
        } catch (cancelErr) {
          console.error(`├── ⚠️ Failed to cancel old sub ${sub.id}:`, cancelErr.message);
        }
      }
    }

    // ── 4. Create Stripe subscription ──
    console.log("├── 💸 [BACKEND] Dispatching subscription request to Stripe helper...");
    const subscription = await createStripeSubscription({
      customerId: customer.id,
      amountCents,
    });

    // ── 5. Upsert User row + optionally insert Transaction (atomic) ──
    console.log("├── 💾 [BACKEND] Executing database transaction to upsert User and record Transaction...");
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
            monthlyAmount: amount,
          },
          update: {
            firstName,
            lastName,
            country,
            stripeCustomerId: customer.id,
            monthlyAmount: amount,
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
      console.log("├── 💾 [BACKEND] Database write successful.");
    } catch (dbError) {
      // ── DEAD-LETTER LOG ──
      console.error('🚨 DEAD-LETTER: Stripe succeeded but DB write failed', {
        stripeCustomerId: customer.id,
        stripeSubscriptionId: subscription.id,
        email,
        amountCents,
        dbError: dbError.message,
      });
    }

    // ── 6. Respond based on subscription status ──
    if (subscription.status === 'active') {
      console.log(`└── 🎉 [BACKEND] Success response returned: \x1b[32m${subscription.id}\x1b[0m (Status: active)\n`);
      return res.status(201).json({
        success: true,
        subscriptionId: subscription.id,
        status: 'active',
      });
    }

    if (subscription.status === 'incomplete') {
      const clientSecret =
        subscription.latest_invoice?.payment_intent?.client_secret || null;
      console.log(`└── ⚠️  [BACKEND] Subscription incomplete: requires action (SCA).\n`);
      return res.status(202).json({
        success: true,
        subscriptionId: subscription.id,
        clientSecret,
        status: 'requires_action',
      });
    }

    console.log(`└── ⚠️  [BACKEND] Unexpected subscription status: ${subscription.status}\n`);
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
