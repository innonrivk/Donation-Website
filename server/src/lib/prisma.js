import { PrismaClient } from '@prisma/client';
import { withEmailTrigger } from '../middleware/prismaEmailTrigger.js';

/**
 * Shared, singleton Prisma client extended with the email trigger middleware.
 *
 * Why a singleton? Multiple `new PrismaClient()` instances waste connection pool
 * slots and — critically — bypass the $extends middleware registered here.
 * Every route that performs DB writes MUST import from this module so that
 * the email trigger fires consistently on every create operation.
 */
const rawUrl = process.env.DATABASE_URL || 'file:./dev.db';
const safetyParams = 'connection_limit=1&socket_timeout=10&busy_timeout=8000';
const dbUrlWithConcurrencyConfig = rawUrl.includes('?') 
  ? `${rawUrl}&${safetyParams}` 
  : `${rawUrl}?${safetyParams}`;

const prisma = withEmailTrigger(new PrismaClient({
  datasources: {
    db: {
      url: dbUrlWithConcurrencyConfig,
    },
  },
}));

export default prisma;
