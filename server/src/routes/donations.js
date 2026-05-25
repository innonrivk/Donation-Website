import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { createStripeCustomer, createStripeSubscription } from '../services/stripe.js';

const router = Router();
const prisma = new PrismaClient();

// POST /api/v1/donations/subscribe
// Creates a new Stripe subscription, auto-creates user if they don't exist
router.post('/subscribe', async (req, res, next) => {
  try {
    const { email, firstName, lastName, country, amount } = req.body;

    // Validate required fields
    if (!email || !firstName || !lastName || !amount) {
      return res.status(400).json({
        error: 'Missing required fields: email, firstName, lastName, amount',
      });
    }

    if (amount < 1) {
      return res.status(400).json({ error: 'Minimum donation amount is $1' });
    }

    // Since we are mocking Stripe and Database for now during testing,
    // we will simulate a successful subscription creation.
    // In production, we would check if user exists, hash password (if provided), 
    // create a Stripe customer, and create a Stripe subscription.
    
    console.log(`[MOCK] Processing donation for ${firstName} ${lastName} (${email}) - Amount: $${amount}`);

    // Mock successful response
    res.status(201).json({
      success: true,
      subscriptionId: 'sub_mock_123456789',
      clientSecret: null, // No 3D secure confirmation needed for mock
      status: 'active',
    });
  } catch (error) {
    console.error('Subscription error:', error);

    if (error.type === 'StripeCardError') {
      return res.status(400).json({ error: error.message });
    }

    next(error);
  }
});

export default router;
