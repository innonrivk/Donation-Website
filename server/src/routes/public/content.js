import { Router } from 'express';
import prisma from '../../lib/prismaPublic.js';
import { mapDonationBoxes } from '../../lib/mapDonationBoxes.js';

const router = Router();

/**
 * GET /api/v1/public/content
 * Returns all public-facing content: website text, active donation boxes, active projects, tiers.
 * Uses the shared mapDonationBoxes utility to resolve tier perks.
 */
router.get('/', async (req, res, next) => {
  try {
    const [websiteContent, donationBoxes, projects, tiers, milestones] = await Promise.all([
      prisma.websiteContent.findFirst({ orderBy: { id: 'desc' } }),
      prisma.donationBox.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
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

    const mappedDonationBoxes = mapDonationBoxes(donationBoxes, tiers);

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
