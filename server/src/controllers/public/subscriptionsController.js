import prisma from '../../lib/prismaPublic.js';
import { stripe, isMockMode, listActiveSubscriptions } from '../../services/stripe.js';
import { sendAmountChangedEmail, sendCancelScheduledEmail } from '../../services/email.js';

/**
 * Handle updating the user's monthly subscription.
 *
 * Why? Performs critical backend validation on incoming dollar amounts
 * (ensuring integers of at least $1) before scheduling update transactions
 * in either Stripe or mock database mode.
 *
 * @param {import('express').Request} req - Express request.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next middleware.
 */
export async function updateSubscription(req, res, next) {
  try {
    const { amount } = req.body; // in dollars

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || !Number.isInteger(parsedAmount) || parsedAmount < 1) {
      return res.status(400).json({ error: 'validation_error', message: 'Amount must be a whole number of at least $1.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user?.stripeCustomerId) {
      return res.status(404).json({ error: 'no_subscription', message: 'No active subscription found.' });
    }

    const amountCents = parsedAmount * 100;
    const donorName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Valued Donor';

    if (isMockMode) {
      const now = new Date();
      const effectiveDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          scheduledAmount: parsedAmount,
          scheduledAmountEffectiveDate: effectiveDate,
        },
      });

      await sendAmountChangedEmail({
        to: user.email,
        donorName,
        oldAmount: user.monthlyAmount,
        newAmount: parsedAmount,
        effectiveDate,
      });

      process.stdout.write(JSON.stringify({
        level: 'INFO',
        ts: new Date().toISOString(),
        event: 'MOCK_SUBSCRIPTION_UPDATE_SCHEDULED',
        userId: user.id,
        email: user.email,
        amountDollars: parsedAmount,
      }) + '\n');

      return res.status(200).json({
        status: 'SCHEDULED',
        message: 'Your donation update has been scheduled and will take effect at the end of the current billing period.',
        newAmount: parsedAmount,
      });
    }

    // Real Stripe: Find active subscription and update
    const activeSubs = await listActiveSubscriptions(user.stripeCustomerId);
    if (activeSubs.length === 0) {
      return res.status(404).json({ error: 'no_subscription', message: 'No active subscription found.' });
    }

    const subscription = activeSubs[0];
    const subscriptionItemId = subscription.items.data[0].id;
    const effectiveDate = new Date(subscription.current_period_end * 1000);

    // Update Stripe subscription without proration (takes effect at end of period)
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

    await prisma.user.update({
      where: { id: user.id },
      data: {
        scheduledAmount: parsedAmount,
        scheduledAmountEffectiveDate: effectiveDate,
      },
    });

    await sendAmountChangedEmail({
      to: user.email,
      donorName,
      oldAmount: user.monthlyAmount,
      newAmount: parsedAmount,
      effectiveDate,
    });

    return res.status(200).json({
      status: 'SCHEDULED',
      message: 'Your donation update has been scheduled and will take effect at the end of the current billing period.',
      newAmount: parsedAmount,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Handle full cancellation of subscription at current cycle end.
 *
 * Why? Reverts billing records immediately on Stripe to avoid next cycle charges
 * and schedules database status update.
 *
 * @param {import('express').Request} req - Express request.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next middleware.
 */
export async function cancelSubscription(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user?.stripeCustomerId) {
      return res.status(404).json({ error: 'no_subscription', message: 'No active subscription found.' });
    }

    if (isMockMode) {
      process.stdout.write(JSON.stringify({
        level: 'INFO',
        ts: new Date().toISOString(),
        event: 'MOCK_SUBSCRIPTION_CANCEL',
        userId: user.id,
        email: user.email,
      }) + '\n');

      await prisma.user.update({
        where: { id: user.id },
        data: {
          monthlyAmount: 0,
          scheduledAmount: null,
          scheduledAmountEffectiveDate: null,
        },
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
      data: {
        monthlyAmount: 0,
        scheduledAmount: null,
        scheduledAmountEffectiveDate: null,
      },
    });

    return res.status(200).json({
      status: 'CANCELLED',
      message: 'Subscription will be cancelled at the end of the current billing period.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Cancel a scheduled subscription price change before it takes effect.
 *
 * Why? Reverts the scheduled price back to the user's active monthlyAmount
 * on Stripe to maintain sync, and resets DB fields.
 *
 * @param {import('express').Request} req - Express request.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next middleware.
 */
export async function cancelScheduledSubscription(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) {
      return res.status(404).json({ error: 'user_not_found', message: 'User not found.' });
    }
    if (user.scheduledAmount === null) {
      return res.status(400).json({ error: 'no_scheduled_change', message: 'No scheduled donation update found.' });
    }

    // Revert the price on Stripe to monthlyAmount before resetting DB fields.
    if (!isMockMode && user.stripeCustomerId) {
      const activeSubs = await listActiveSubscriptions(user.stripeCustomerId);
      if (activeSubs.length > 0) {
        const subscription = activeSubs[0];
        const subscriptionItemId = subscription.items.data[0].id;
        await stripe.subscriptions.update(subscription.id, {
          items: [{
            id: subscriptionItemId,
            price_data: {
              currency: 'usd',
              product_data: { name: 'Monthly Donation - OpenmindProjects' },
              unit_amount: user.monthlyAmount * 100, // Revert to current monthlyAmount in cents
              recurring: { interval: 'month' },
            },
          }],
          proration_behavior: 'none',
        });
      }
    }

    // Reset scheduled fields in the DB
    await prisma.user.update({
      where: { id: user.id },
      data: {
        scheduledAmount: null,
        scheduledAmountEffectiveDate: null,
      },
    });

    const donorName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Valued Donor';

    await sendCancelScheduledEmail({
      to: user.email,
      donorName,
      amount: user.monthlyAmount,
    });

    return res.status(200).json({
      status: 'CANCELLED_SCHEDULED',
      message: 'Your scheduled monthly donation change has been cancelled.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Manually trigger mock billing cycle rollover.
 *
 * Why? Simulates the rollover of the deferred donation in mock/dev environment
 * without waiting. Relies on the Prisma hook to trigger the receipt email safely.
 *
 * @param {import('express').Request} req - Express request.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next middleware.
 */
export async function simulateRollover(req, res, next) {
  if (!isMockMode) {
    return res.status(403).json({ error: 'forbidden', message: 'This endpoint is only available in mock mode.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) {
      return res.status(404).json({ error: 'user_not_found', message: 'User not found.' });
    }
    if (user.scheduledAmount === null) {
      return res.status(400).json({ error: 'no_scheduled_change', message: 'No scheduled donation update to roll over.' });
    }

    const scheduledAmt = user.scheduledAmount;
    const scheduledAmtCents = Math.round(scheduledAmt * 100);

    // Execute rollover inside a SQLite-safe transaction
    await prisma.$transaction(async (tx) => {
      // Create a new transaction record representing the rollover payment
      await tx.transaction.create({
        data: {
          userId: user.id,
          amount: scheduledAmtCents,
          status: 'SUCCEEDED',
          stripePaymentIntentId: `pi_mock_rollover_${Date.now()}`,
          isRecurring: true,
        },
      });

      // Promote scheduledAmount → monthlyAmount and clear scheduled fields
      await tx.user.update({
        where: { id: user.id },
        data: {
          monthlyAmount: scheduledAmt,
          scheduledAmount: null,
          scheduledAmountEffectiveDate: null,
        },
      });
    });

    process.stdout.write(JSON.stringify({
      level: 'INFO',
      ts: new Date().toISOString(),
      event: 'MOCK_BILLING_ROLLOVER_SIMULATED',
      userId: user.id,
      email: user.email,
      newAmountDollars: scheduledAmt,
    }) + '\n');

    return res.status(200).json({
      status: 'ROLLED_OVER',
      message: `Billing cycle simulated. Donation updated to $${scheduledAmt}/mo.`,
      newAmount: scheduledAmt,
    });
  } catch (error) {
    next(error);
  }
}
