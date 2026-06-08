import prisma from '../../lib/prisma.js';
import { z } from 'zod';
import { ErrorCodes } from '../../lib/errors.js';

const DonationMilestoneSchema = z.object({
  amountUsd: z.number().int().min(1, 'Amount must be at least $1'),
  label: z.string().min(1, 'Label is required'),
  description: z.string().min(1, 'Description is required'),
  isRepeatable: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
});

export async function getMilestones(req, res, next) {
  try {
    const milestones = await prisma.donationMilestone.findMany({
      orderBy: { displayOrder: 'asc' },
    });
    return res.status(200).json(milestones);
  } catch (error) {
    next(error);
  }
}

export async function createMilestone(req, res, next) {
  try {
    const parsed = DonationMilestoneSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: ErrorCodes.VALIDATION_ERROR,
        message: 'Invalid milestone data.',
        fields: parsed.error.flatten().fieldErrors,
      });
    }

    const newMilestone = await prisma.donationMilestone.create({
      data: parsed.data,
    });
    return res.status(201).json(newMilestone);
  } catch (error) {
    next(error);
  }
}

export async function updateMilestone(req, res, next) {
  try {
    const { id } = req.params;
    const parsed = DonationMilestoneSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: ErrorCodes.VALIDATION_ERROR,
        message: 'Invalid milestone data.',
        fields: parsed.error.flatten().fieldErrors,
      });
    }

    const milestoneId = parseInt(id, 10);
    if (isNaN(milestoneId)) {
      return res.status(400).json({ error: ErrorCodes.VALIDATION_ERROR, message: 'Invalid milestone ID.' });
    }

    const updated = await prisma.donationMilestone.update({
      where: { id: milestoneId },
      data: parsed.data,
    });
    return res.status(200).json(updated);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: ErrorCodes.NOT_FOUND, message: 'Milestone not found.' });
    }
    next(error);
  }
}

export async function deleteMilestone(req, res, next) {
  try {
    const { id } = req.params;
    const milestoneId = parseInt(id, 10);
    if (isNaN(milestoneId)) {
      return res.status(400).json({ error: ErrorCodes.VALIDATION_ERROR, message: 'Invalid milestone ID.' });
    }

    await prisma.$transaction(async (tx) => {
      // Clean up claimed milestones
      await tx.claimedMilestone.deleteMany({
        where: { milestoneId },
      });
      // Delete the milestone
      await tx.donationMilestone.delete({
        where: { id: milestoneId },
      });
    });

    return res.status(200).json({ message: 'Milestone deleted successfully.' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: ErrorCodes.NOT_FOUND, message: 'Milestone not found.' });
    }
    next(error);
  }
}
