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
const prisma = withEmailTrigger(new PrismaClient());

export default prisma;
