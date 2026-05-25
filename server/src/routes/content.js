import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/v1/content
// Returns all public-facing content: website text, active donation boxes, active projects, tiers
router.get('/', async (req, res, next) => {
  try {
    const [websiteContent, donationBoxes, projects, tiers] = await Promise.all([
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
    ]);

    res.json({
      websiteContent,
      donationBoxes,
      projects,
      tiers,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
