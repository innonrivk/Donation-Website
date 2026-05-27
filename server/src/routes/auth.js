import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { z } from 'zod';
import { requireAuth, issueTokenCookie } from '../middleware/auth.js';
import { stripe, isMockMode, listActiveSubscriptions } from '../services/stripe.js';


const router = Router();
const prisma = new PrismaClient();
const SALT_ROUNDS = 12;
const OTP_EXPIRY_MINUTES = 15;
const MAX_OTP_ATTEMPTS = 5;

// ── Zod schemas ──
const SignupSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const OtpVerifySchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  password: z.string().min(8).optional(), // Only required for REGISTRATION
});

// ── Helpers ──
function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

async function createAndStoreOtp(email, purpose, newEmail = null) {
  // Delete any existing OTPs for this email + purpose
  await prisma.userOtp.deleteMany({ where: { email, purpose } });

  const plainOtp = generateOtp();
  const hashedOtp = await bcrypt.hash(plainOtp, SALT_ROUNDS);

  await prisma.userOtp.create({
    data: {
      email,
      otp: hashedOtp,
      purpose,
      newEmail,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
    },
  });

  // In production: send the OTP via email service.
  // For development: log it to the console.
  if (purpose === 'EMAIL_CHANGE') {
    console.log(`\n📧 [OTP] Code to change email of ${email} to ${newEmail}: \x1b[33m${plainOtp}\x1b[0m\n`);
  } else {
    console.log(`\n📧 [OTP] Code for ${email} (purpose: ${purpose}): \x1b[33m${plainOtp}\x1b[0m\n`);
  }

  return plainOtp;
}

// ────────────────────────────────────────────────────────
// POST /api/v1/auth/signup
// ────────────────────────────────────────────────────────
router.post('/signup', async (req, res, next) => {
  try {
    const parsed = SignupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Invalid input.',
        fields: parsed.error.flatten().fieldErrors,
      });
    }

    const { firstName, lastName, email, password } = parsed.data;

    // Check if a shadow user exists (password == null)
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser && existingUser.password) {
      // Fully registered user — can't sign up again
      return res.status(409).json({
        error: 'email_taken',
        message: 'An account with this email already exists. Please log in.',
      });
    }

    if (existingUser && !existingUser.password) {
      // Shadow account — trigger OTP claim flow
      const plainOtp = await createAndStoreOtp(email, 'REGISTRATION');
      return res.status(200).json({
        status: 'OTP_REQUIRED',
        message: 'A verification code has been sent to your email.',
        email,
        ...(process.env.NODE_ENV !== 'production' && { devOtp: plainOtp }),
      });
    }

    // Normal new user — create with password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        password: hashedPassword,
        role: 'DONOR',
      },
    });

    issueTokenCookie(res, user);
    return res.status(201).json({
      status: 'CREATED',
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
    });
  } catch (error) {
    next(error);
  }
});

// ────────────────────────────────────────────────────────
// POST /api/v1/auth/verify-otp
// ────────────────────────────────────────────────────────
router.post('/verify-otp', async (req, res, next) => {
  try {
    const parsed = OtpVerifySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Invalid input.',
        fields: parsed.error.flatten().fieldErrors,
      });
    }

    const { email, otp, password } = parsed.data;

    // Find the OTP record
    const otpRecord = await prisma.userOtp.findFirst({
      where: { email },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      return res.status(404).json({ error: 'otp_not_found', message: 'No verification code found. Please request a new one.' });
    }

    // Check expiry
    if (new Date() > otpRecord.expiresAt) {
      await prisma.userOtp.delete({ where: { id: otpRecord.id } });
      return res.status(410).json({ error: 'otp_expired', message: 'Verification code has expired. Please request a new one.' });
    }

    // Brute-force lockout — 5 attempts max
    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      await prisma.userOtp.delete({ where: { id: otpRecord.id } });
      return res.status(429).json({ error: 'too_many_attempts', message: 'Too many attempts. Please request a new verification code.' });
    }

    // Verify OTP
    const isValid = await bcrypt.compare(otp, otpRecord.otp);

    if (!isValid) {
      // Increment attempts
      await prisma.userOtp.update({
        where: { id: otpRecord.id },
        data: { attempts: otpRecord.attempts + 1 },
      });

      const remaining = MAX_OTP_ATTEMPTS - (otpRecord.attempts + 1);
      return res.status(401).json({
        error: 'invalid_otp',
        message: `Incorrect code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
        attemptsRemaining: remaining,
      });
    }

    // OTP is valid — delete immediately to prevent replay
    await prisma.userOtp.delete({ where: { id: otpRecord.id } });

    // Handle based on purpose
    if (otpRecord.purpose === 'REGISTRATION') {
      if (!password) {
        return res.status(400).json({ error: 'password_required', message: 'Password is required for account activation.' });
      }

      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      const user = await prisma.user.update({
        where: { email },
        data: { password: hashedPassword },
      });

      issueTokenCookie(res, user);
      return res.status(201).json({
        status: 'ACTIVATED',
        message: 'Account activated successfully.',
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
      });
    }

    if (otpRecord.purpose === 'PASSWORD_CHANGE') {
      if (!password) {
        return res.status(400).json({ error: 'password_required', message: 'New password is required.' });
      }

      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      await prisma.user.update({
        where: { email },
        data: { password: hashedPassword },
      });

      return res.status(200).json({ status: 'PASSWORD_CHANGED', message: 'Password updated successfully.' });
    }

    if (otpRecord.purpose === 'EMAIL_CHANGE') {
      const newEmail = otpRecord.newEmail;
      const user = await prisma.user.update({
        where: { email },
        data: { email: newEmail },
      });

      // Sync to Stripe if customer exists
      if (user.stripeCustomerId && !isMockMode) {
        try {
          await stripe.customers.update(user.stripeCustomerId, { email: newEmail });
        } catch (e) {
          console.error('Failed to update Stripe customer email:', e.message);
        }
      }

      // Re-issue cookie with new email
      issueTokenCookie(res, { ...user, email: newEmail });
      return res.status(200).json({ status: 'EMAIL_CHANGED', message: 'Email updated successfully.' });
    }

    return res.status(400).json({ error: 'unknown_purpose', message: 'Unknown OTP purpose.' });
  } catch (error) {
    next(error);
  }
});

// ────────────────────────────────────────────────────────
// POST /api/v1/auth/login
// ────────────────────────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Invalid input.',
        fields: parsed.error.flatten().fieldErrors,
      });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.password) {
      return res.status(401).json({ error: 'invalid_credentials', message: 'Invalid email or password.' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'invalid_credentials', message: 'Invalid email or password.' });
    }

    issueTokenCookie(res, user);
    return res.status(200).json({
      status: 'LOGGED_IN',
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
    });
  } catch (error) {
    next(error);
  }
});

// ────────────────────────────────────────────────────────
// POST /api/v1/auth/google
// Google token verification + auto shadow merge
// Uses mock mode for local development
// ────────────────────────────────────────────────────────
router.post('/google', async (req, res, next) => {
  try {
    const { email, firstName, lastName, googleId } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'missing_email', message: 'Email is required from Google.' });
    }

    // In production: verify the Google ID token with Google's API.
    // For now: trust the mock data.
    let user = await prisma.user.findUnique({ where: { email } });

    if (user && !user.password) {
      // Shadow account — auto-merge (Google acts as trusted IdP)
      user = await prisma.user.update({
        where: { email },
        data: {
          password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), SALT_ROUNDS),
          firstName: firstName || user.firstName,
          lastName: lastName || user.lastName,
        },
      });
    } else if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          email,
          firstName: firstName || 'Google',
          lastName: lastName || 'User',
          password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), SALT_ROUNDS),
          role: 'DONOR',
        },
      });
    }

    issueTokenCookie(res, user);
    return res.status(200).json({
      status: 'LOGGED_IN',
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
    });
  } catch (error) {
    next(error);
  }
});

// ────────────────────────────────────────────────────────
// POST /api/v1/auth/logout
// ────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
  });
  return res.status(200).json({ status: 'LOGGED_OUT', message: 'Logged out successfully.' });
});

// ────────────────────────────────────────────────────────
// GET /api/v1/auth/me
// Returns authenticated user's full profile
// ────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
        claimedMilestones: {
          include: { milestone: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'user_not_found', message: 'User not found.' });
    }

    // Calculate lifetime total (in cents → dollars)
    const lifetimeTotal = user.transactions
      .filter(t => t.status === 'SUCCEEDED')
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate current tier based on monthly amount
    const [tiers, milestones, donationBoxes] = await Promise.all([
      prisma.tier.findMany({ orderBy: { tierLevel: 'asc' } }),
      prisma.donationMilestone.findMany({ orderBy: { displayOrder: 'asc' } }),
      prisma.donationBox.findMany({ where: { isActive: true }, orderBy: { displayOrder: 'asc' } }),
    ]);

    // Get active subscription amount directly from user.monthlyAmount
    const monthlyAmountDollars = user.monthlyAmount;

    // Match tier
    const currentTier = tiers.find(t => {
      const matchesMin = monthlyAmountDollars >= t.minAmount;
      const matchesMax = t.maxAmount === null || monthlyAmountDollars <= t.maxAmount;
      return matchesMin && matchesMax;
    }) || null;

    const mappedDonationBoxes = donationBoxes.map(box => {
      const plainBox = { ...box };
      if (!plainBox.isCustomAmount) {
        const matchingTier = tiers.find(
          t => t.name.toLowerCase() === plainBox.title.toLowerCase()
        );
        if (matchingTier) {
          let perks = [];
          try {
            perks = typeof matchingTier.perks === 'string'
              ? JSON.parse(matchingTier.perks)
              : (Array.isArray(matchingTier.perks) ? matchingTier.perks : []);
          } catch (e) {
            perks = [];
          }
          plainBox.perks = perks;
        } else {
          plainBox.perks = plainBox.tierDetails
            ? plainBox.tierDetails.split('|').map(p => p.trim())
            : [];
        }
      } else {
        plainBox.perks = plainBox.tierDetails
          ? plainBox.tierDetails.split('|').map(p => p.trim())
          : [];
      }
      return plainBox;
    });

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        country: user.country,
        stripeCustomerId: user.stripeCustomerId,
        createdAt: user.createdAt,
      },
      tier: currentTier,
      monthlyAmount: monthlyAmountDollars,
      lifetimeTotal: Math.round(lifetimeTotal / 100), // in dollars
      transactions: user.transactions.map(t => ({
        id: t.id,
        amount: t.amount,
        status: t.status,
        createdAt: t.createdAt,
      })),
      claimedMilestones: user.claimedMilestones.map(cm => ({
        milestoneId: cm.milestoneId,
        claimedAt: cm.claimedAt,
      })),
      milestones,
      tiers,
      donationBoxes: mappedDonationBoxes,
    });
  } catch (error) {
    next(error);
  }
});

// ────────────────────────────────────────────────────────
// POST /api/v1/auth/settings/password-otp
// Send OTP to current email for password change
// ────────────────────────────────────────────────────────
router.post('/settings/password-otp', requireAuth, async (req, res, next) => {
  try {
    const plainOtp = await createAndStoreOtp(req.user.email, 'PASSWORD_CHANGE');
    return res.status(200).json({
      status: 'OTP_SENT',
      message: 'Verification code sent to your email.',
      ...(process.env.NODE_ENV !== 'production' && { devOtp: plainOtp }),
    });
  } catch (error) {
    next(error);
  }
});

// ────────────────────────────────────────────────────────
// POST /api/v1/auth/settings/change-password
// Verify OTP and update password
// ────────────────────────────────────────────────────────
router.post('/settings/change-password', requireAuth, async (req, res, next) => {
  try {
    const { otp, newPassword } = req.body;

    if (!otp || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'validation_error', message: 'OTP and new password (8+ chars) are required.' });
    }

    // Delegate to verify-otp logic with purpose check
    const otpRecord = await prisma.userOtp.findFirst({
      where: { email: req.user.email, purpose: 'PASSWORD_CHANGE' },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      return res.status(404).json({ error: 'otp_not_found', message: 'No verification code found. Please request a new one.' });
    }

    if (new Date() > otpRecord.expiresAt) {
      await prisma.userOtp.delete({ where: { id: otpRecord.id } });
      return res.status(410).json({ error: 'otp_expired', message: 'Verification code has expired.' });
    }

    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      await prisma.userOtp.delete({ where: { id: otpRecord.id } });
      return res.status(429).json({ error: 'too_many_attempts', message: 'Too many attempts. Please request a new code.' });
    }

    const isValid = await bcrypt.compare(otp, otpRecord.otp);
    if (!isValid) {
      await prisma.userOtp.update({
        where: { id: otpRecord.id },
        data: { attempts: otpRecord.attempts + 1 },
      });
      const remaining = MAX_OTP_ATTEMPTS - (otpRecord.attempts + 1);
      return res.status(401).json({
        error: 'invalid_otp',
        message: `Incorrect code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
      });
    }

    await prisma.userOtp.delete({ where: { id: otpRecord.id } });

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({
      where: { email: req.user.email },
      data: { password: hashedPassword },
    });

    return res.status(200).json({ status: 'PASSWORD_CHANGED', message: 'Password updated successfully.' });
  } catch (error) {
    next(error);
  }
});

// ────────────────────────────────────────────────────────
// POST /api/v1/auth/settings/email-otp
// Send OTP to the NEW email for email change
// ────────────────────────────────────────────────────────
router.post('/settings/email-otp', requireAuth, async (req, res, next) => {
  try {
    const { newEmail } = req.body;
    if (!newEmail || !z.string().email().safeParse(newEmail).success) {
      return res.status(400).json({ error: 'validation_error', message: 'Valid new email is required.' });
    }

    // Check if new email is already taken
    const existing = await prisma.user.findUnique({ where: { email: newEmail } });
    if (existing) {
      return res.status(409).json({ error: 'email_taken', message: 'This email is already in use.' });
    }

    const plainOtp = await createAndStoreOtp(req.user.email, 'EMAIL_CHANGE', newEmail);
    return res.status(200).json({
      status: 'OTP_SENT',
      message: 'Verification code sent to the new email.',
      ...(process.env.NODE_ENV !== 'production' && { devOtp: plainOtp }),
    });
  } catch (error) {
    next(error);
  }
});

// ────────────────────────────────────────────────────────
// POST /api/v1/auth/settings/change-email
// Verify OTP and update email in DB + Stripe
// ────────────────────────────────────────────────────────
router.post('/settings/change-email', requireAuth, async (req, res, next) => {
  try {
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ error: 'validation_error', message: 'Verification code is required.' });
    }

    const otpRecord = await prisma.userOtp.findFirst({
      where: { email: req.user.email, purpose: 'EMAIL_CHANGE' },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      return res.status(404).json({ error: 'otp_not_found', message: 'No verification code found.' });
    }

    if (new Date() > otpRecord.expiresAt) {
      await prisma.userOtp.delete({ where: { id: otpRecord.id } });
      return res.status(410).json({ error: 'otp_expired', message: 'Verification code has expired.' });
    }

    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      await prisma.userOtp.delete({ where: { id: otpRecord.id } });
      return res.status(429).json({ error: 'too_many_attempts', message: 'Too many attempts.' });
    }

    const isValid = await bcrypt.compare(otp, otpRecord.otp);
    if (!isValid) {
      await prisma.userOtp.update({
        where: { id: otpRecord.id },
        data: { attempts: otpRecord.attempts + 1 },
      });
      return res.status(401).json({ error: 'invalid_otp', message: 'Incorrect code.' });
    }

    await prisma.userOtp.delete({ where: { id: otpRecord.id } });

    const newEmail = otpRecord.newEmail;
    const user = await prisma.user.update({
      where: { email: req.user.email },
      data: { email: newEmail },
    });

    // Sync to Stripe
    if (user.stripeCustomerId && !isMockMode) {
      try {
        await stripe.customers.update(user.stripeCustomerId, { email: newEmail });
      } catch (e) {
        console.error('Failed to update Stripe customer email:', e.message);
      }
    }

    issueTokenCookie(res, { ...user, email: newEmail });
    return res.status(200).json({ status: 'EMAIL_CHANGED', message: 'Email updated successfully.' });
  } catch (error) {
    next(error);
  }
});

// ────────────────────────────────────────────────────────
// POST /api/v1/auth/settings/change-name
// Update name in DB and sync to Stripe
// ────────────────────────────────────────────────────────
router.post('/settings/change-name', requireAuth, async (req, res, next) => {
  try {
    const { firstName, lastName } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'validation_error', message: 'First name and last name are required.' });
    }

    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: { firstName, lastName },
    });

    // Sync to Stripe
    if (user.stripeCustomerId && !isMockMode) {
      try {
        await stripe.customers.update(user.stripeCustomerId, {
          name: `${firstName} ${lastName}`,
        });
      } catch (e) {
        console.error('Failed to update Stripe customer name:', e.message);
      }
    }
    return res.status(200).json({
      status: 'NAME_CHANGED',
      message: 'Name updated successfully.',
      user: { firstName: user.firstName, lastName: user.lastName },
    });
  } catch (error) {
    next(error);
  }
});

// ────────────────────────────────────────────────────────
// POST /api/v1/auth/settings/delete-otp
// Generate OTP code for account deletion
// ────────────────────────────────────────────────────────
router.post('/settings/delete-otp', requireAuth, async (req, res, next) => {
  try {
    const plainOtp = await createAndStoreOtp(req.user.email, 'ACCOUNT_DELETE');
    return res.status(200).json({
      status: 'OTP_SENT',
      message: 'Verification code sent to your email.',
      ...(process.env.NODE_ENV !== 'production' && { devOtp: plainOtp }),
    });
  } catch (error) {
    next(error);
  }
});

// ────────────────────────────────────────────────────────
// POST /api/v1/auth/settings/delete-account
// Verify OTP and permanently delete account + billing
// ────────────────────────────────────────────────────────
router.post('/settings/delete-account', requireAuth, async (req, res, next) => {
  try {
    const { otp } = req.body;
    if (!otp) {
      return res.status(400).json({ error: 'validation_error', message: 'Verification code is required.' });
    }

    const email = req.user.email;
    const userId = req.user.userId;

    const otpRecord = await prisma.userOtp.findFirst({
      where: { email, purpose: 'ACCOUNT_DELETE' },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      return res.status(404).json({ error: 'otp_not_found', message: 'No verification code found. Please request a new one.' });
    }

    if (new Date() > otpRecord.expiresAt) {
      await prisma.userOtp.delete({ where: { id: otpRecord.id } });
      return res.status(410).json({ error: 'otp_expired', message: 'Verification code has expired.' });
    }

    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      await prisma.userOtp.delete({ where: { id: otpRecord.id } });
      return res.status(429).json({ error: 'too_many_attempts', message: 'Too many attempts.' });
    }

    const isValid = await bcrypt.compare(otp, otpRecord.otp);
    if (!isValid) {
      await prisma.userOtp.update({
        where: { id: otpRecord.id },
        data: { attempts: otpRecord.attempts + 1 },
      });
      return res.status(401).json({ error: 'invalid_otp', message: 'Incorrect code.' });
    }

    // Delete OTP record immediately
    await prisma.userOtp.delete({ where: { id: otpRecord.id } });

    // Cancel active subscriptions on Stripe if customer exists
    const userRecord = await prisma.user.findUnique({ where: { id: userId } });
    if (userRecord?.stripeCustomerId) {
      try {
        if (isMockMode) {
          console.log(`🔌 [STRIPE] (Mock) Wiped subscriptions for deleted customer ${userRecord.stripeCustomerId}`);
        } else {
          const activeSubs = await listActiveSubscriptions(userRecord.stripeCustomerId);
          for (const sub of activeSubs) {
            await stripe.subscriptions.cancel(sub.id);
          }
        }
      } catch (stripeErr) {
        console.error('Failed to cancel Stripe subscriptions during account deletion:', stripeErr.message);
      }
    }

    // Atomic transaction to delete all user records and relations
    await prisma.$transaction([
      prisma.vote.deleteMany({ where: { userId } }),
      prisma.transaction.deleteMany({ where: { userId } }),
      prisma.claimedMilestone.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);

    // Clear auth cookie
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
    });

    return res.status(200).json({
      status: 'DELETED',
      message: 'Your account has been permanently deleted.',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
