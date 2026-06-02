/**
 * @fileoverview Cloud-agnostic SendGrid email trigger handler.
 *
 * This module provides three named exports, each adapting a different cloud
 * provider's database event format into a unified SendGrid email dispatch.
 * It is intentionally isolated from the Express server — import it ONLY in
 * cloud function entrypoints, never in server/src/index.js.
 *
 * Supported platforms:
 *  - Firebase Cloud Functions v2 (Firestore)
 *  - MongoDB Atlas App Services Triggers
 *  - Generic serverless (AWS Lambda, Google Cloud Run, etc.)
 */

import sgMail from '@sendgrid/mail';

// ── Immutable sender — never read from env to prevent drift ───────────────────
const SENDER = 'OpenmindProjects <innon.programming@gmail.com>';

// ── Startup guard ─────────────────────────────────────────────────────────────
const apiKey = process.env.SENDGRID_API_KEY;
if (!apiKey || apiKey === 'SG.replace_with_your_key') {
  throw new Error(
    '[dbTriggerSendGrid] SENDGRID_API_KEY is missing or still a placeholder. ' +
    'Set it in your cloud function environment secrets.'
  );
}
sgMail.setApiKey(apiKey);

// ── Structured logger ─────────────────────────────────────────────────────────
const logger = {
  info: (event, meta = {}) => {
    process.stdout.write(JSON.stringify({ level: 'INFO', ts: new Date().toISOString(), event, ...meta }) + '\n');
  },
  error: (event, meta = {}) => {
    process.stderr.write(JSON.stringify({ level: 'ERROR', ts: new Date().toISOString(), event, ...meta }) + '\n');
  }
};

/**
 * Sends an email using the cloud SendGrid config.
 * 
 * @private
 * @param {Object} emailOptions
 * @param {string} emailOptions.to
 * @param {string} emailOptions.subject
 * @param {string} emailOptions.html
 * @returns {Promise<boolean>}
 */
async function sendCloudEmail({ to, subject, html }) {
  try {
    await sgMail.send({
      to,
      from: SENDER,
      subject,
      html
    });
    logger.info('CLOUD_EMAIL_DISPATCH_SUCCESS', { to, subject });
    return true;
  } catch (err) {
    logger.error('CLOUD_EMAIL_DISPATCH_FAILURE', { to, error: err.response ? err.response.body : err.message });
    return false;
  }
}

/**
 * Normalizes and processes database triggers from Firestore, MongoDB, or Generic events.
 * 
 * @param {Object} data - Unified data payload.
 * @param {'USER'|'TRANSACTION'} type - Entity type.
 * @returns {Promise<boolean>}
 */
export async function processTrigger(data, type) {
  if (type === 'USER') {
    const email = data.email;
    const name = data.firstName || 'Friend';
    if (!email) {
      logger.error('TRIGGER_USER_MISSING_EMAIL', { data });
      return false;
    }
    const html = `
      <div style="font-family: sans-serif; padding: 20px; max-width: 500px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2>Welcome, ${name}!</h2>
        <p>Thank you for joining OpenmindProjects. Your support helps fund real-world projects that matter. We're thrilled to have you on board.</p>
        <p style="font-size: 12px; color: #a0aec0;">&copy; ${new Date().getFullYear()} OpenmindProjects. All rights reserved.</p>
      </div>
    `;
    return sendCloudEmail({
      to: email,
      subject: 'Welcome to OpenmindProjects — You\'re making a difference!',
      html
    });
  }

  if (type === 'TRANSACTION') {
    const email = data.email || (data.user && data.user.email);
    if (!email) {
      logger.error('TRIGGER_TRANSACTION_MISSING_EMAIL', { data });
      return false;
    }
    if (data.stripePaymentIntentId) {
      logger.info('TRIGGER_TRANSACTION_STRIPE_SKIPPED', { id: data.id });
      return false;
    }
    const amountStr = ((data.amount || 0) / 100).toFixed(2);
    const html = `
      <div style="font-family: sans-serif; padding: 20px; max-width: 500px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2>Donation Receipt</h2>
        <p>Thank you for your generous support of $${amountStr}. Your contribution goes directly towards our active projects.</p>
        <div style="background-color: #f7fafc; padding: 12px; border-radius: 4px; margin: 10px 0;">
          <p style="margin: 4px 0;"><strong>Amount:</strong> $${amountStr}</p>
          <p style="margin: 4px 0;"><strong>Transaction ID:</strong> ${data.id || 'N/A'}</p>
        </div>
        <p style="font-size: 12px; color: #a0aec0;">&copy; ${new Date().getFullYear()} OpenmindProjects. All rights reserved.</p>
      </div>
    `;
    return sendCloudEmail({
      to: email,
      subject: 'Thank you for your donation!',
      html
    });
  }

  logger.error('TRIGGER_UNKNOWN_TYPE', { type });
  return false;
}

/**
 * Cloud handler for Firestore (Firebase Cloud Functions v2).
 * 
 * @param {Object} event - The Firestore write event.
 * @param {'USER'|'TRANSACTION'} type - The entity type.
 * @returns {Promise<boolean>}
 */
export async function handleFirestoreTrigger(event, type) {
  const data = event.data ? event.data.data() : null;
  if (!data) {
    logger.error('FIRESTORE_TRIGGER_EMPTY_PAYLOAD');
    return false;
  }
  return processTrigger(data, type);
}

/**
 * Cloud handler for MongoDB Atlas App Services Triggers.
 * 
 * @param {Object} changeEvent - The MongoDB change stream event.
 * @param {'USER'|'TRANSACTION'} type - The entity type.
 * @returns {Promise<boolean>}
 */
export async function handleMongoAtlasTrigger(changeEvent, type) {
  const data = changeEvent.fullDocument;
  if (!data) {
    logger.error('MONGODB_TRIGGER_EMPTY_PAYLOAD');
    return false;
  }
  return processTrigger(data, type);
}

/**
 * Generic serverless cloud handler (AWS Lambda / Google Cloud Run / HTTP Webhook).
 * 
 * @param {Object} payload - The direct data payload.
 * @param {'USER'|'TRANSACTION'} type - The entity type.
 * @returns {Promise<boolean>}
 */
export async function handleGenericTrigger(payload, type) {
  return processTrigger(payload, type);
}