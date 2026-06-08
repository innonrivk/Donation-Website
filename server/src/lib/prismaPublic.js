import prisma from './prisma.js';

/**
 * Content models that MUST NOT be writable from public controllers.
 * Any write attempt on these models through the public proxy will throw.
 */
const PROTECTED_MODELS = [
  'websiteContent',
  'donationBox',
  'projectDetail',
  'tier',
  'donationMilestone',
];

/**
 * Prisma mutation methods that are blocked on protected models.
 */
const WRITE_METHODS = [
  'create',
  'createMany',
  'update',
  'updateMany',
  'upsert',
  'delete',
  'deleteMany',
];

/**
 * Top-level raw SQL methods that bypass model-level guards.
 * Why block these? A developer could execute arbitrary INSERT/UPDATE/DELETE
 * SQL against protected tables, completely circumventing the model proxy.
 */
const BLOCKED_RAW_METHODS = [
  '$queryRaw',
  '$queryRawUnsafe',
  '$executeRaw',
  '$executeRawUnsafe',
];

/**
 * Creates a write-blocking proxy for a given Prisma client instance.
 *
 * Why extract this into a factory? Interactive transactions receive a fresh
 * Prisma transaction client (`tx`) that is NOT the same object as the root
 * client. Without recursively wrapping `tx`, the guard is bypassed inside
 * $transaction callbacks. This factory allows us to wrap both the root
 * client and any transaction client with identical protection.
 *
 * @param {import('@prisma/client').PrismaClient} target - The Prisma client to wrap.
 * @returns {Proxy} A proxied client that blocks writes on protected models.
 */
function createPublicGuardProxy(target) {
  return new Proxy(target, {
    get(obj, prop, _receiver) {
      // Block raw SQL methods that could bypass model-level guards
      if (typeof prop === 'string' && BLOCKED_RAW_METHODS.includes(prop)) {
        return () => {
          throw new Error(
            `[PUBLIC_GUARD] Raw query access denied: ${prop}(). ` +
            'Raw SQL execution is not permitted through public controllers.'
          );
        };
      }

      const value = obj[prop];

      // Intercept $transaction to recursively guard the inner tx client
      if (prop === '$transaction') {
        return (...args) => {
          const firstArg = args[0];

          // Interactive transaction: $transaction(async (tx) => { ... })
          if (typeof firstArg === 'function') {
            return target.$transaction((tx) => {
              const guardedTx = createPublicGuardProxy(tx);
              return firstArg(guardedTx);
            }, args[1]);
          }

          // Batch transaction: $transaction([promise1, promise2])
          // Batch transactions use the same client, safe to pass through
          return target.$transaction(...args);
        };
      }

      // Bind top-level functions ($connect, $disconnect, etc.)
      if (typeof value === 'function') {
        return value.bind(obj);
      }

      // Wrap protected content models with a write-blocking proxy
      if (
        typeof prop === 'string' &&
        PROTECTED_MODELS.includes(prop) &&
        value !== null &&
        typeof value === 'object'
      ) {
        return new Proxy(value, {
          get(modelTarget, method) {
            if (typeof method === 'string' && WRITE_METHODS.includes(method)) {
              return () => {
                throw new Error(
                  `[PUBLIC_GUARD] Write access denied on content model: ${prop}.${method}(). ` +
                  'Content mutations are only permitted through admin controllers.'
                );
              };
            }
            const methodValue = modelTarget[method];
            if (typeof methodValue === 'function') {
              return methodValue.bind(modelTarget);
            }
            return methodValue;
          },
        });
      }

      return value;
    },
  });
}

const prismaPublic = createPublicGuardProxy(prisma);

export default prismaPublic;
