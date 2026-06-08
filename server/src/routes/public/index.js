import { Router } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import authRoutes from './auth.js';
import contentRoutes from './content.js';
import donationRoutes from './donations.js';
import milestoneRoutes from './milestones.js';
import subscriptionRoutes from './subscriptions.js';
import webhookRoutes from './webhooks.js';

const router = Router();

// Per-router CORS for Public (Client-facing) namespace
router.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Rate limiting on public authentications
const publicAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 999999,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'rate_limited',
    message: 'Too many requests. Please try again later.',
  },
});

// Rate limiting on public donations
const publicDonationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 999999,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'rate_limited',
    message: 'Too many donation attempts. Please try again in a few minutes.',
  },
});

// Mount sub-routers
router.use('/auth', publicAuthLimiter, authRoutes);
router.use('/content', contentRoutes);
router.use('/donations', publicDonationLimiter, donationRoutes);
router.use('/milestones', milestoneRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/webhooks', webhookRoutes);

export default router;
