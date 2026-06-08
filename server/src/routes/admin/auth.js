import { Router } from 'express';
import { requireAdminAuth } from '../../middleware/adminAuth.js';
import {
  adminLogin,
  adminRefresh,
  adminLogout,
  getMe,
} from '../../controllers/admin/adminAuthController.js';

const router = Router();

/**
 * Publicly accessible admin auth endpoints.
 */
router.post('/login', adminLogin);
router.post('/refresh', adminRefresh);

/**
 * Authenticated admin auth endpoints.
 */
router.post('/logout', requireAdminAuth, adminLogout);
router.get('/me', requireAdminAuth, getMe);

export default router;
