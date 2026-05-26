import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// ────────────────────────────────────────────────────────
// POST /api/v1/milestones/claim
// Write a ClaimedMilestone record for an unlocked milestone
// ────────────────────────────────────────────────────────
router.post('/claim', requireAuth, async (req, res, next) => {
  try {
    const { milestoneId } = req.body;

    if (!milestoneId) {
      return res.status(400).json({ error: 'validation_error', message: 'Milestone ID is required.' });
    }

    // Verify milestone exists
    const milestone = await prisma.donationMilestone.findUnique({
      where: { id: milestoneId },
    });

    if (!milestone) {
      return res.status(404).json({ error: 'milestone_not_found', message: 'Milestone not found.' });
    }

    // Check if already claimed (unless repeatable)
    if (!milestone.isRepeatable) {
      const existing = await prisma.claimedMilestone.findUnique({
        where: {
          userId_milestoneId: {
            userId: req.user.userId,
            milestoneId,
          },
        },
      });

      if (existing) {
        return res.status(409).json({ error: 'already_claimed', message: 'You have already claimed this milestone.' });
      }
    }

    // Verify user has reached the required lifetime amount
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { transactions: true },
    });

    const lifetimeTotalDollars = user.transactions
      .filter(t => t.status === 'SUCCEEDED')
      .reduce((sum, t) => sum + t.amount, 0) / 100;

    if (lifetimeTotalDollars < milestone.amountUsd) {
      return res.status(403).json({
        error: 'not_eligible',
        message: `You need a lifetime total of $${milestone.amountUsd} to claim this milestone. Current: $${lifetimeTotalDollars.toFixed(0)}.`,
      });
    }

    // Claim the milestone
    const claimed = await prisma.claimedMilestone.create({
      data: {
        userId: req.user.userId,
        milestoneId,
      },
    });

    return res.status(201).json({
      status: 'CLAIMED',
      message: `Congratulations! You've claimed "${milestone.label}".`,
      claimedMilestone: {
        milestoneId: claimed.milestoneId,
        claimedAt: claimed.claimedAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
