import prisma from '../lib/prisma.js';

/**
 * Express middleware to prevent the deletion of protected user accounts.
 *
 * Why a deceptive 200 OK?
 * If we return a 403 Forbidden with a specific error message, we disclose the
 * existence and status of a highly privileged account to potential attackers
 * who are scanning or testing the API endpoints. Returning a simulated success
 * response (mimicking the default behavior when an OTP code is requested) prevents
 * privilege enumeration and keeps the attack surface opaque.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next function.
 */
export async function blockProtectedUser(req, res, next) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'not_authenticated', message: 'Please log in.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isProtected: true },
    });

    if (user?.isProtected) {
      // Deceptive 200 OK response mimicking successful OTP dispatch
      return res.status(200).json({
        status: 'OTP_SENT',
        message: 'Verification code sent to your email.',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}
