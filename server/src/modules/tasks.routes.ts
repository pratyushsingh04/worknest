import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { badRequest, forbidden, notFound } from '../lib/errors';
import { canManageProject, findAccessibleProject } from '../lib/access';
import { logActivity } from '../lib/activity';
import { broadcastProgress, statusLabel } from '../lib/progress';
import { emit, rooms } from '../lib/socket';
import { currentUser, param, requireAuth, requireRole } from '../middleware/auth';

export const tasksRouter = Router();
tasksRouter.use(requireAuth, requireRole('ADMIN', 'MANAGER', 'EMPLOYEE'));

const taskInclude = { assignee: { select: { id: true, name: true } } } as const;

const taskBody = z.object({
  title: z.string().trim().min(2),
  description: z.string().trim().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assigneeId: z.string().nullable().optional(),
  milestoneId: z.string().nullable().optional(),
  estimateHours: z.number().positive().max(1000).nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  position: z.number().int().min(0).optional(),
});

async function assertAssignable(projectId: string, assigneeId?: string | null) {
  if (!assigneeId) return;
  const member = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId: assigneeId } } });
  if (!member) throw badRequest('Tasks can only be assigned to project team members');
}

async function assertMilestone(projectId: string, milestoneId?: string | null) {
  if (!milestoneId) return;
  const milestone = await prisma.milestone.findFirst({ where: { id: milestoneId, projectId } });
  if (!milestone) throw badRequest('Milestone does not belong to this project');
}

tasksRouter.get('/mine', async (req, res) => {
  const user = currentUser(req);
  const tasks = await prisma.task.findMany({
    where: { assigneeId: user.id, project: { companyId: user.companyId } },
    include: { project: { select: { id: true, name: true } } },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
  });
  res.json({ tasks });
});

tasksRouter.post('/', async (req, res) => {
  const user = currentUser(req);
  const { projectId, ...body } = taskBody.extend({ projectId: z.string() }).parse(req.body);
  const project = await findAccessibleProject(user, projectId);
  if (!project) throw notFound('Project not found');
  if (!canManageProject(user, project)) throw forbidden('Only the project manager can create tasks');
  await assertAssignable(project.id, body.assigneeId);
  await assertMilestone(project.id, body.milestoneId);

  const position = body.position ?? (await prisma.task.count({ where: { projectId: project.id, status: body.status ?? 'TODO' } }));
  const task = await prisma.task.create({
    data: { ...body, position, projectId: project.id, completedAt: body.status === 'DONE' ? new Date() : null },
    include: taskInclude,
  });
  emit(rooms.project(project.id), 'task:created', task);
  await logActivity({ companyId: user.companyId, actorId: user.id, projectId: project.id, message: `created task "${task.title}"` });
  await broadcastProgress(project.id);
  res.status(201).json({ task });
});

tasksRouter.patch('/:id', async (req, res) => {
  const user = currentUser(req);
  const existing = await prisma.task.findUnique({ where: { id: param(req, 'id') } });
  const project = existing && (await findAccessibleProject(user, existing.projectId));
  if (!existing || !project) throw notFound('Task not found');

  const body = taskBody.partial().parse(req.body);
  const isManager = canManageProject(user, project);
  if (!isManager) {
    // Team members may only move their own tasks across the board.
    const allowed = new Set(['status', 'position']);
    if (existing.assigneeId !== user.id) throw forbidden('You can only update tasks assigned to you');
    if (Object.keys(body).some((k) => !allowed.has(k))) throw forbidden('Only the project manager can edit task details');
  }
  await assertAssignable(project.id, body.assigneeId);
  await assertMilestone(project.id, body.milestoneId);

  const statusChanged = body.status !== undefined && body.status !== existing.status;
  const task = await prisma.task.update({
    where: { id: existing.id },
    data: {
      ...body,
      ...(statusChanged ? { completedAt: body.status === 'DONE' ? new Date() : null } : {}),
    },
    include: taskInclude,
  });
  emit(rooms.project(project.id), 'task:updated', task);

  if (statusChanged) {
    const done = task.status === 'DONE';
    await logActivity({
      companyId: user.companyId,
      actorId: user.id,
      projectId: project.id,
      message: done ? `completed "${task.title}"` : `moved "${task.title}" to ${statusLabel[task.status]}`,
      // Completed work is what clients care about; internal shuffling stays internal.
      clientVisible: done,
    });
    await broadcastProgress(project.id);
  } else if (body.assigneeId !== undefined && body.assigneeId !== existing.assigneeId && task.assignee) {
    await logActivity({ companyId: user.companyId, actorId: user.id, projectId: project.id, message: `assigned "${task.title}" to ${task.assignee.name}` });
    emit(rooms.user(task.assignee.id), 'notification', { message: `You were assigned "${task.title}"`, projectId: project.id });
  }
  res.json({ task });
});

tasksRouter.delete('/:id', async (req, res) => {
  const user = currentUser(req);
  const existing = await prisma.task.findUnique({ where: { id: param(req, 'id') } });
  const project = existing && (await findAccessibleProject(user, existing.projectId));
  if (!existing || !project) throw notFound('Task not found');
  if (!canManageProject(user, project)) throw forbidden('Only the project manager can delete tasks');

  await prisma.task.delete({ where: { id: existing.id } });
  emit(rooms.project(project.id), 'task:deleted', { id: existing.id });
  await broadcastProgress(project.id);
  res.json({ ok: true });
});
