import { Router } from 'express';
import { requireAdminAuth } from '../../middleware/adminAuth.js';
import { requireAuth } from '../../middleware/auth.js';
import {
  adminLogin,
  adminRefresh,
  adminLogout,
  getMe,
  upgradeSession,
} from '../../controllers/admin/adminAuthController.js';
import {
  requestPasswordOtp,
  changePassword,
  requestEmailOtp,
  changeEmail,
} from '../../controllers/admin/adminSettingsController.js';

const router = Router();

/**
 * Publicly accessible admin auth endpoints.
 */
router.post('/login', adminLogin);
router.post('/refresh', adminRefresh);

/**
 * Upgrade regular authenticated session to admin session.
 */
router.post('/upgrade', requireAuth, upgradeSession);

/**
 * Authenticated admin auth endpoints.
 */
router.post('/logout', requireAdminAuth, adminLogout);
router.get('/me', requireAdminAuth, getMe);

/**
 * Authenticated admin settings endpoints.
 */
router.post('/settings/password-otp', requireAdminAuth, requestPasswordOtp);
router.post('/settings/change-password', requireAdminAuth, changePassword);
router.post('/settings/email-otp', requireAdminAuth, requestEmailOtp);
router.post('/settings/change-email', requireAdminAuth, changeEmail);

export default router;
