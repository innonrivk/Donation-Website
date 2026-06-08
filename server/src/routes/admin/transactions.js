import { Router } from 'express';
import {
  getTransactions,
  getTransactionDetails,
  getMetrics,
} from '../../controllers/admin/adminTransactionController.js';

const router = Router();

router.get('/', getTransactions);
router.get('/metrics', getMetrics);
router.get('/:id', getTransactionDetails);

export default router;
