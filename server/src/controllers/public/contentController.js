import prisma from '../../lib/prisma.js';

/**
 * Module-level in-memory cache holding the dynamic copy dictionary.
 * 
 * Why in-memory? SQLite suffers from read concurrency bottlenecks under heavy load. 
 * Storing a flat, single-level lookup dictionary in-memory reduces DB roundtrips to 
 * exactly zero for active users.
 */
let cachedContent = null;

/**
 * Programmatically resets the dynamic site text cache.
 * 
 * Why export this? Enables the admin content controller to trigger cache invalidation 
 * whenever a batch update commits successfully.
 */
export const clearContentCache = () => {
  cachedContent = null;
};

/**
 * GET /api/v1/public/content/site-text
 * 
 * Fetches, structures, and returns all dynamic site copy fields.
 * 
 * Why flat JSON? Reduces data serialization overhead and lets the React client perform 
 * O(1) synchronous copy queries.
 * Why Cache-Control? Tells downstream CDNs and browsers to immediately revalidate the cached 
 * assets with the server, ensuring rapid propagation of copy updates.
 * 
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next middleware
 */
export const getPublicContent = async (req, res, next) => {
  try {
    res.set('Cache-Control', 'public, max-age=0, must-revalidate');

    if (cachedContent) {
      return res.status(200).json(cachedContent);
    }

    const records = await prisma.siteText.findMany();
    const content = records.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    cachedContent = content;
    return res.status(200).json(cachedContent);
  } catch (error) {
    next(error);
  }
};
