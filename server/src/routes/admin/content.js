import { Router } from 'express';
import {
  getContents,
  createContent,
  updateContent,
  deleteContent,
  getDonationBoxes,
  createDonationBox,
  updateDonationBox,
  deleteDonationBox,
} from '../../controllers/admin/adminContentController.js';
import { updateContent as updateSiteText } from '../../controllers/admin/contentController.js';

const router = Router();

// Website Content
router.get('/', getContents);
router.post('/', createContent);
router.put('/site-text', updateSiteText);
router.put('/:id', updateContent);
router.delete('/:id', deleteContent);

// Donation Boxes
router.get('/donation-boxes', getDonationBoxes);
router.post('/donation-boxes', createDonationBox);
router.put('/donation-boxes/:id', updateDonationBox);
router.delete('/donation-boxes/:id', deleteDonationBox);

export default router;
