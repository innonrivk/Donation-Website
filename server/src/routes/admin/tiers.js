import { Router } from 'express';
import {
  getTiers,
  createTier,
  updateTier,
  deleteTier,
} from '../../controllers/admin/adminTierController.js';

const router = Router();

router.get('/', getTiers);
router.post('/', createTier);
router.put('/:id', updateTier);
router.delete('/:id', deleteTier);

export default router;
