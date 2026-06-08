import prisma from '../../lib/prisma.js';
import { z } from 'zod';
import { ErrorCodes } from '../../lib/errors.js';

const ProjectDetailSchema = z.object({
  projectName: z.string().min(1, 'Project name is required'),
  details: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  imageUrl: z.string().url().nullable().optional().or(z.literal('')),
  fundingGoal: z.number().int().min(0, 'Funding goal must be at least 0'), // cents
  fundedAmount: z.number().int().min(0, 'Funded amount must be at least 0').optional(), // cents
});

export async function getProjects(req, res, next) {
  try {
    const projects = await prisma.projectDetail.findMany({
      include: {
        piggyBanks: true,
      },
    });
    return res.status(200).json(projects);
  } catch (error) {
    next(error);
  }
}

export async function createProject(req, res, next) {
  try {
    const parsed = ProjectDetailSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: ErrorCodes.VALIDATION_ERROR,
        message: 'Invalid project data.',
        fields: parsed.error.flatten().fieldErrors,
      });
    }

    const { imageUrl, ...rest } = parsed.data;
    const finalImageUrl = imageUrl === '' ? null : imageUrl;

    const newProject = await prisma.projectDetail.create({
      data: {
        ...rest,
        imageUrl: finalImageUrl,
      },
    });
    return res.status(201).json(newProject);
  } catch (error) {
    next(error);
  }
}

export async function updateProject(req, res, next) {
  try {
    const { id } = req.params;
    const parsed = ProjectDetailSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: ErrorCodes.VALIDATION_ERROR,
        message: 'Invalid project data.',
        fields: parsed.error.flatten().fieldErrors,
      });
    }

    const projectId = parseInt(id, 10);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: ErrorCodes.VALIDATION_ERROR, message: 'Invalid project ID.' });
    }

    const { imageUrl, ...rest } = parsed.data;
    const finalImageUrl = imageUrl === '' ? null : imageUrl;

    const updated = await prisma.projectDetail.update({
      where: { id: projectId },
      data: {
        ...rest,
        imageUrl: finalImageUrl,
      },
    });
    return res.status(200).json(updated);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: ErrorCodes.NOT_FOUND, message: 'Project not found.' });
    }
    next(error);
  }
}

export async function deleteProject(req, res, next) {
  try {
    const { id } = req.params;
    const projectId = parseInt(id, 10);
    if (isNaN(projectId)) {
      return res.status(400).json({ error: ErrorCodes.VALIDATION_ERROR, message: 'Invalid project ID.' });
    }

    // SQLite safe cascade or transaction clean up
    await prisma.$transaction(async (tx) => {
      // Delete votes related to this project
      await tx.vote.deleteMany({
        where: { projectId },
      });
      // Delete piggy banks related to this project
      await tx.piggyBank.deleteMany({
        where: { projectId },
      });
      // Delete project
      await tx.projectDetail.delete({
        where: { id: projectId },
      });
    });

    return res.status(200).json({ message: 'Project and related records deleted successfully.' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: ErrorCodes.NOT_FOUND, message: 'Project not found.' });
    }
    next(error);
  }
}
