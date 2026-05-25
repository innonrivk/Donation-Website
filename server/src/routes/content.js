import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/v1/content
// Returns all public-facing content: website text, active donation boxes, active projects, tiers
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
