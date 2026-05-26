import Stripe from 'stripe';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';
const stripe = new Stripe(stripeKey);

export const isMockMode = stripeKey.startsWith('sk_test_placeholder') || stripeKey.includes('replace_with_your_key');

if (isMockMode) {
  console.log("\n⚠️  [STRIPE SERVICE] Running in MOCK MODE. No real Stripe API calls will be made.\n");
}

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
  if (isMockMode) {
    console.log(`├── 🔌 [STRIPE] (Mock) upsertStripeCustomer for: ${email}`);
    if (existingCustomerId) {
      console.log(`├── 🔌 [STRIPE] (Mock) Attaching PaymentMethod ${paymentMethodId} to customer ${existingCustomerId}`);
      return {
        id: existingCustomerId,
        email,
        name,
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      };
    }
    const mockCustomerId = `cus_mock_${Math.random().toString(36).substring(7)}`;
    console.log(`├── 🔌 [STRIPE] (Mock) Created customer: ${mockCustomerId}`);
    return {
      id: mockCustomerId,
      email,
      name,
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    };
  }

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
  if (isMockMode) {
    const mockSubId = `sub_mock_${Math.random().toString(36).substring(7)}`;
    const mockInvId = `in_mock_${Math.random().toString(36).substring(7)}`;
    const mockPiId = `pi_mock_${Math.random().toString(36).substring(7)}`;
    console.log(`├── 🔌 [STRIPE] (Mock) Creating subscription (amount: ${amountCents} cents)`);
    console.log(`├── 🔌 [STRIPE] (Mock) Generated: ${mockSubId}, invoice: ${mockInvId}, intent: ${mockPiId}`);

    return {
      id: mockSubId,
      status: 'active',
      latest_invoice: {
        id: mockInvId,
        payment_intent: {
          id: mockPiId,
          client_secret: `pi_mock_secret_${Math.random().toString(36).substring(7)}`,
        },
      },
    };
  }

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
  if (isMockMode) {
    console.log(`├── 🔌 [STRIPE] (Mock) Checking active subscriptions for: ${customerId}`);
    return [];
  }

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
