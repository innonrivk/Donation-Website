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
 * Proxied Prisma client for public controllers.
 *
 * Why? The implementation plan guards content-model writes via convention
 * (no write handlers in public controllers). This proxy enforces the rule
 * mechanically: if a developer accidentally adds a content write to a
 * public controller, it will throw loudly at runtime rather than silently
 * mutating production data.
 *
 * - Reads on protected models (findMany, findFirst, aggregate, etc.) pass through.
 * - Writes on protected models throw an Error with a clear message.
 * - All operations on transactional models (User, Transaction, etc.) pass through.
 * - Top-level methods ($transaction, $connect, etc.) pass through bound to the original client.
 */
const handler = {
  get(target, prop, _receiver) {
    const value = target[prop];

    // Bind top-level functions ($transaction, $connect, $disconnect, etc.)
    if (typeof value === 'function') {
      return value.bind(target);
    }

    // Wrap protected content models with a write-blocking proxy
    if (typeof prop === 'string' && PROTECTED_MODELS.includes(prop) && value !== null && typeof value === 'object') {
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
};

const prismaPublic = new Proxy(prisma, handler);

export default prismaPublic;
