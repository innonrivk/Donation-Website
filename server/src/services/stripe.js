import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Create a Stripe customer with a default payment method attached
 */
export async function createStripeCustomer({ email, name, paymentMethodId }) {
  // Attach payment method first
  const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
    customer: undefined, // will attach to new customer below
  }).catch(() => {
    // If already attached, that's fine
    return { id: paymentMethodId };
  });

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
 * Create a Stripe subscription with a dynamic price (based on donation amount)
 */
export async function createStripeSubscription({ customerId, amount, paymentMethodId }) {
  // Set the payment method as the default for invoices
  await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });

  // Create a subscription with an inline price
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Monthly Donation - OpenmindProjects',
            description: 'Recurring monthly donation to support community projects',
          },
          unit_amount: amount, // already in cents
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
  });

  return subscription;
}

export { stripe };
