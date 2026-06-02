import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { stripe, isMockMode, listActiveSubscriptions } from '../services/stripe.js';

const router = Router();

// ────────────────────────────────────────────────────────
// POST /api/v1/subscriptions/update
// Modify active Stripe subscription amount
// ────────────────────────────────────────────────────────
router.post('/update', requireAuth, async (req, res, next) => {
  try {
    const { amount } = req.body; // in dollars
    if (!amount || amount < 1) {
      return res.status(400).json({ error: 'validation_error', message: 'Amount must be at least $1.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user?.stripeCustomerId) {
      return res.status(404).json({ error: 'no_subscription', message: 'No active subscription found.' });
    }

    const amountCents = amount * 100;

    if (isMockMode) {
      console.log(`🔌 [STRIPE] (Mock) Updating subscription for ${user.email} to $${amount}/mo`);

      // Record mock transaction
      await prisma.transaction.create({
        data: {
          userId: user.id,
          amount: amountCents,
          status: 'SUCCEEDED',
          stripePaymentIntentId: `pi_mock_update_${Date.now()}`,
        },
      });

      // Update monthlyAmount in DB
      await prisma.user.update({
        where: { id: user.id },
        data: { monthlyAmount: amount },
      });

      return res.status(200).json({
        status: 'UPDATED',
        message: `Subscription updated to $${amount}/month.`,
        newAmount: amount,
      });
    }

    // Real Stripe: find active subscription and update
    const activeSubs = await listActiveSubscriptions(user.stripeCustomerId);
    if (activeSubs.length === 0) {
      return res.status(404).json({ error: 'no_subscription', message: 'No active subscription found.' });
    }

    const subscription = activeSubs[0];
    const subscriptionItemId = subscription.items.data[0].id;

    await stripe.subscriptions.update(subscription.id, {
      items: [{
        id: subscriptionItemId,
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Monthly Donation - OpenmindProjects',
          },
          unit_amount: amountCents,
          recurring: { interval: 'month' },
        },
      }],
      proration_behavior: 'none',
    });

    // Update monthlyAmount in DB
    await prisma.user.update({
      where: { id: user.id },
      data: { monthlyAmount: amount },
    });

    return res.status(200).json({
      status: 'UPDATED',
      message: `Subscription updated to $${amount}/month.`,
      newAmount: amount,
    });
  } catch (error) {
    next(error);
  }
});

// ────────────────────────────────────────────────────────
// POST /api/v1/subscriptions/cancel
// Cancel subscription at period end
// ────────────────────────────────────────────────────────
router.post('/cancel', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user?.stripeCustomerId) {
      return res.status(404).json({ error: 'no_subscription', message: 'No active subscription found.' });
    }

    if (isMockMode) {
      console.log(`🔌 [STRIPE] (Mock) Cancelling subscription for ${user.email}`);
      await prisma.user.update({
        where: { id: user.id },
        data: { monthlyAmount: 0 },
      });
      return res.status(200).json({
        status: 'CANCELLED',
        message: 'Subscription will be cancelled at the end of the current billing period.',
      });
    }

    const activeSubs = await listActiveSubscriptions(user.stripeCustomerId);
    if (activeSubs.length === 0) {
      return res.status(404).json({ error: 'no_subscription', message: 'No active subscription found.' });
    }

    await stripe.subscriptions.update(activeSubs[0].id, {
      cancel_at_period_end: true,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { monthlyAmount: 0 },
    });

    return res.status(200).json({
      status: 'CANCELLED',
      message: 'Subscription will be cancelled at the end of the current billing period.',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
