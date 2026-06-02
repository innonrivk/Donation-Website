import { sendEmail } from '../services/email.js';

/**
 * Structured logger to output indexable logs.
 * 
 * Why JSON? Machine-readable JSON logs are easily aggregated by log management
 * tools (such as Datadog or GCP Logging) without complex regex mapping.
 */
const logger = {
  info: (event, meta = {}) => {
    process.stdout.write(JSON.stringify({ level: 'INFO', ts: new Date().toISOString(), event, ...meta }) + '\n');
  },
  error: (event, meta = {}) => {
    process.stderr.write(JSON.stringify({ level: 'ERROR', ts: new Date().toISOString(), event, ...meta }) + '\n');
  }
};

/**
 * Extension module decorating the Prisma Client with automated trigger interceptors.
 * 
 * Intercepts user and transaction creation events to trigger welcome and receipt
 * emails. It safely bypasses real Stripe-sourced payments (which receive callbacks)
 * but executes immediately for mock transactions and manual entries.
 * 
 * @param {import('@prisma/client').PrismaClient} client - The raw Prisma Client.
 * @returns {import('@prisma/client').PrismaClient} Extended client with trigger middlewares.
 */
export function withEmailTrigger(client) {
  return client.$extends({
    query: {
      user: {
        async create({ args, query }) {
          // Dynamic seed extraction to bypass welcome emails in seed files
          const { skipWelcomeEmail, ...cleanData } = args.data;
          args.data = cleanData;

          const result = await query(args);

          if (!skipWelcomeEmail) {
            logger.info('USER_CREATE_TRIGGER_DETECTED', { userId: result.id, email: result.email });
            
            sendEmail({
              to: result.email,
              subject: 'Welcome to OpenmindProjects — You\'re making a difference!',
              title: `Welcome, ${result.firstName || 'Friend'}!`,
              messageText: `Hi ${result.firstName || ''}, thank you for joining OpenmindProjects. Your support helps fund real-world projects that matter. We're thrilled to have you on board.`
            }).catch((err) => {
              logger.error('WELCOME_EMAIL_TRIGGER_FAILED', { error: err.message, userId: result.id });
            });
          }

          return result;
        }
      },
      transaction: {
        async create({ args, query }) {
          const result = await query(args);

          // Deduplication Guard:
          // In production, Stripe webhooks trigger receipts. We bypass the ORM trigger
          // if stripePaymentIntentId exists to avoid duplicates.
          // BUT in development / mock mode (starts with 'pi_mock_'), webhooks never fire,
          // so we MUST process and trigger the email receipt immediately!
          const isMockTransaction = result.stripePaymentIntentId?.startsWith('pi_mock_');
          
          if (!result.stripePaymentIntentId || isMockTransaction) {
            logger.info('MANUAL_OR_MOCK_TRANSACTION_TRIGGER_DETECTED', { 
              transactionId: result.id, 
              userId: result.userId,
              isMock: isMockTransaction 
            });

            // Fetch user info asynchronously to keep database write non-blocking
            // and wait 100ms to allow any active interactive transactions to commit!
            setTimeout(() => {
              client.user.findUnique({
                where: { id: result.userId }
              }).then((user) => {
                if (user && user.email) {
                  sendEmail({
                    to: user.email,
                    subject: 'Thank you for your donation!',
                    title: 'Donation Receipt',
                    messageText: `Thank you for your generous support of $${(result.amount / 100).toFixed(2)}. Your contribution goes directly towards our active projects.`,
                    receiptData: {
                      amount: result.amount,
                      transactionId: result.stripeInvoiceId || result.id,
                      date: result.createdAt
                    }
                  }).catch((err) => {
                    logger.error('TRANSACTION_RECEIPT_TRIGGER_FAILED', { error: err.message, transactionId: result.id });
                  });
                } else {
                  logger.error('TRANSACTION_RECEIPT_USER_NOT_FOUND_OR_NO_EMAIL', { userId: result.userId, transactionId: result.id });
                }
              }).catch((err) => {
                logger.error('TRANSACTION_RECEIPT_USER_FETCH_FAILED', { error: err.message, transactionId: result.id });
              });
            }, 100);
          }

          return result;
        }
      }
    }
  });
}