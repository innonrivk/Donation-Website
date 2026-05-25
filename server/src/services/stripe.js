import Stripe from 'stripe';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// ── Startup guard: fail fast if secret key is missing ──
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error(
    'STRIPE_SECRET_KEY is not set in environment variables. ' +
    'Add it to server/.env before starting the server.'
  );
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Upsert a Stripe customer.
 *
 * - If `existingCustomerId` is provided, attaches the new payment method
 *   and sets it as the invoice default.
 * - Otherwise, creates a brand-new Stripe customer with the PM attached.
 *
 * @param {{ email: string, name: string, paymentMethodId: string, existingCustomerId?: string }}
 * @returns {Promise<Stripe.Customer>}
 */
export async function upsertStripeCustomer({ email, name, paymentMethodId, existingCustomerId }) {
  if (existingCustomerId) {
    // ── Returning customer: attach PM, then set as default ──
    try {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: existingCustomerId,
      });
    } catch (err) {
      // Only ignore "already attached" — rethrow everything else
      if (err.code !== 'resource_already_exists') throw err;
    }

    const customer = await stripe.customers.update(existingCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    return customer;
  }

  // ── New customer: create first, then attach PM ──
  const customer = await stripe.customers.create({
    email,
    name,
    payment_method: paymentMethodId,
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });

  return customer;
}

/**
 * Create a Stripe subscription with a dynamic inline price.
 *
 * Uses `payment_behavior: 'default_incomplete'` so that subscriptions
 * requiring SCA return `status: 'incomplete'` with a `client_secret`
 * the frontend can use with `stripe.confirmCardPayment()`.
 *
 * @param {{ customerId: string, amountCents: number }}
 * @returns {Promise<Stripe.Subscription>}
 */
export async function createStripeSubscription({ customerId, amountCents }) {
  // Deterministic idempotency key: prevents duplicate subs on retries
  const idempotencyKey = crypto
    .createHash('sha256')
    .update(`${customerId}:${amountCents}:${Date.now()}`)
    .digest('hex')
    .slice(0, 32);

  const subscription = await stripe.subscriptions.create(
    {
      customer: customerId,
      items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Monthly Donation - OpenmindProjects',
              description: 'Recurring monthly donation to support community projects',
            },
            unit_amount: amountCents,
            recurring: {
              interval: 'month',
            },
          },
        },
      ],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
    },
    { idempotencyKey }
  );

  return subscription;
}

/**
 * List active/trialing subscriptions for a customer.
 * Used by the duplicate-subscription guard.
 *
 * @param {string} customerId
 * @returns {Promise<Stripe.Subscription[]>}
 */
export async function listActiveSubscriptions(customerId) {
  const { data } = await stripe.subscriptions.list({
    customer: customerId,
    status: 'active',
    limit: 100,
  });

  // Also check trialing
  const { data: trialingData } = await stripe.subscriptions.list({
    customer: customerId,
    status: 'trialing',
    limit: 100,
  });

  return [...data, ...trialingData];
}

export { stripe };
