import { Router } from 'express';
import express from 'express';
import { handleWebhookEvent } from '../../controllers/public/webhooksController.js';

const router = Router();

/**
 * Handles Stripe webhook events — needs RAW body (not JSON-parsed).
 * This will be mounted directly in the main server routing layer.
 */
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  handleWebhookEvent
);

export default router;
