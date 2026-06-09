import { Router } from 'express';
import prisma from '../../lib/prismaPublic.js';
import { mapDonationBoxes } from '../../lib/mapDonationBoxes.js';
import { getPublicContent } from '../../controllers/public/contentController.js';

const router = Router();

/**
 * GET /api/v1/public/content/site-text
 * Fetches all dynamic website text. Optimized via in-memory caching.
 */
router.get('/site-text', getPublicContent);

/**
 * GET /api/v1/public/content
 * Returns all public-facing content: website text, active donation boxes
 * (with tier perks resolved via FK include), active projects, tiers, milestones.
 *
 * Why Promise.all? Executes 5 independent read queries concurrently to
 * minimize latency. Each query is isolated — a failure in one does not
 * block others (though the entire Promise.all will reject).
 *
 * Why include: { tier: true }? Replaces the legacy O(N*M) string-matching
 * in mapDonationBoxes with a single SQL JOIN, eliminating the fragile
 * coupling between DonationBox.title and Tier.name.
 */
router.get('/', async (req, res, next) => {
  try {
    const [websiteContent, donationBoxes, projects, tiers, milestones] = await Promise.all([
      prisma.websiteContent.findFirst({ orderBy: { id: 'desc' } }),
      prisma.donationBox.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
        include: { tier: true },
      }),
      prisma.projectDetail.findMany({
        where: { status: 'ACTIVE' },
      }),
      prisma.tier.findMany({
        orderBy: { tierLevel: 'asc' },
      }),
      prisma.donationMilestone.findMany({
        orderBy: { displayOrder: 'asc' },
      }),
    ]);

    const mappedDonationBoxes = mapDonationBoxes(donationBoxes);

    res.json({
      websiteContent,
      donationBoxes: mappedDonationBoxes,
      projects,
      tiers,
      milestones,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
