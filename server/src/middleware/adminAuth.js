import jwt from 'jsonwebtoken';

/**
 * Admin JWT secret — sourced exclusively from environment.
 * The startup guard in lib/env.js prevents the server from booting
 * in production if this value is missing.
 */
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'dev-admin-secret-DO-NOT-USE-IN-PROD';

/**
 * Admin JWT verification middleware.
 *
 * Why? Admin routes use Bearer token authentication (not cookies) to decouple
 * admin SPA sessions from the donor cookie-based auth flow. This middleware
 * extracts the token from the Authorization header, verifies the signature,
 * asserts the ADMIN role, and attaches the decoded payload to req.adminUser.
 *
 * @param {import('express').Request} req - Express request.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next middleware.
 */
export function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'not_authenticated',
      message: 'Missing or malformed Authorization header. Expected: Bearer <token>.',
    });
  }

  const token = authHeader.slice(7);

  if (!token) {
    return res.status(401).json({
      error: 'not_authenticated',
      message: 'Bearer token is empty.',
    });
  }

  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET);

    if (decoded.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Insufficient privileges. Admin role required.',
      });
    }

    req.adminUser = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'invalid_token',
        message: 'Admin session expired. Please log in again.',
      });
    }

    return res.status(401).json({
      error: 'invalid_token',
      message: 'Invalid admin token.',
    });
  }
}

/**
 * Issue a short-lived admin JWT.
 *
 * Why? Admin tokens expire in 1 hour to limit the blast radius of token theft.
 * Tokens are returned in the response body (not cookies) for SPA consumption.
 *
 * @param {{ id: string, email: string, role: string }} user - Admin user record.
 * @returns {string} Signed JWT string.
 */
export function issueAdminToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    ADMIN_JWT_SECRET,
    { expiresIn: '1h' }
  );
}
