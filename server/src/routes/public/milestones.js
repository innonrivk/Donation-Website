import { Router } from 'express';
import prisma from '../../lib/prismaPublic.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

/**
 * POST /api/v1/public/milestones/claim
 * Write a ClaimedMilestone record for an unlocked milestone.
 */
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

    // Count existing claims for this milestone by the user
    const claimCount = await prisma.claimedMilestone.count({
      where: {
        userId: req.user.userId,
        milestoneId,
      },
    });

    if (!milestone.isRepeatable && claimCount >= 1) {
      return res.status(409).json({ error: 'already_claimed', message: 'You have already claimed this milestone.' });
    }

    // Verify user has reached the required lifetime amount
    const lifetimeTotalAgg = await prisma.transaction.aggregate({
      where: { userId: req.user.userId, status: 'SUCCEEDED' },
      _sum: { amount: true },
    });
    const lifetimeTotalDollars = (lifetimeTotalAgg._sum.amount ?? 0) / 100;

    const requiredAmountDollars = milestone.isRepeatable
      ? (claimCount + 1) * milestone.amountUsd
      : milestone.amountUsd;

    if (lifetimeTotalDollars < requiredAmountDollars) {
      if (milestone.isRepeatable) {
        return res.status(403).json({
          error: 'not_eligible',
          message: `You need a lifetime total of $${requiredAmountDollars} to claim this repeatable milestone again. Current: $${lifetimeTotalDollars.toFixed(0)}.`,
        });
      } else {
        return res.status(403).json({
          error: 'not_eligible',
          message: `You need a lifetime total of $${milestone.amountUsd} to claim this milestone. Current: $${lifetimeTotalDollars.toFixed(0)}.`,
        });
      }
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
