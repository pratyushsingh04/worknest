import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { badRequest, forbidden, notFound } from '../lib/errors';
import { canManageProject, findAccessibleProject, projectScope } from '../lib/access';
import { logActivity } from '../lib/activity';
import { progressFor, progressOf } from '../lib/progress';
import { emit, rooms } from '../lib/socket';
import { currentUser, param, requireAuth, requireRole } from '../middleware/auth';
import { syncTeamProjects } from './teams.routes';
import type { AuthUser } from '../lib/auth';

export const projectsRouter = Router();
projectsRouter.use(requireAuth);

const userBrief = { select: { id: true, name: true, designation: true } } as const;

async function loadProject(user: AuthUser, projectId: string) {
  const project = await findAccessibleProject(user, projectId);
  if (!project) throw notFound('Project not found');
  return project;
}

async function assertStaff(companyId: string, userIds: string[]) {
  if (userIds.length === 0) return;
  const count = await prisma.user.count({
    where: { id: { in: userIds }, companyId, role: { not: 'CLIENT' }, isActive: true },
  });
  if (count !== new Set(userIds).size) throw badRequest('All team members must be active employees of your company');
}

async function findTeam(companyId: string, teamId?: string | null) {
  if (!teamId) return null;
  const team = await prisma.team.findFirst({ where: { id: teamId, companyId } });
  if (!team) throw badRequest('Team not found');
  return team;
}

async function assertClient(companyId: string, clientId?: string | null) {
  if (!clientId) return;
  const client = await prisma.client.findFirst({ where: { id: clientId, companyId } });
  if (!client) throw badRequest('Client not found');
}

projectsRouter.get('/', async (req, res) => {
  const user = currentUser(req);
  const projects = await prisma.project.findMany({
    where: projectScope(user),
    include: {
      client: { select: { id: true, name: true } },
      team: { select: { id: true, name: true, color: true, leadId: true } },
      manager: userBrief,
      members: { include: { user: userBrief } },
    },
    orderBy: { createdAt: 'desc' },
  });
  const progress = await progressFor(projects.map((p) => p.id));
  res.json({ projects: projects.map((p) => ({ ...p, progress: progress[p.id] })) });
});

const projectBody = z.object({
  name: z.string().trim().min(2),
  description: z.string().trim().optional(),
  clientId: z.string().nullable().optional(),
  managerId: z.string().nullable().optional(),
  status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED']).optional(),
  startDate: z.coerce.date().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  memberIds: z.array(z.string()).optional(),
  teamId: z.string().nullable().optional(),
});

projectsRouter.post('/', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const user = currentUser(req);
  const { memberIds = [], ...body } = projectBody.parse(req.body);
  // Managers always lead the projects they create.
  const team = await findTeam(user.companyId, body.teamId);
  // Managers lead what they create; admins default to the team lead.
  const managerId = user.role === 'MANAGER' ? user.id : (body.managerId ?? team?.leadId ?? user.id);
  await assertClient(user.companyId, body.clientId);
  await assertStaff(user.companyId, [managerId, ...memberIds]);

  const project = await prisma.project.create({
    data: {
      ...body,
      managerId,
      companyId: user.companyId,
      members: { create: [...new Set([managerId, ...memberIds])].map((userId) => ({ userId })) },
    },
  });
  await logActivity({
    companyId: user.companyId,
    actorId: user.id,
    projectId: project.id,
    message: `created project ${project.name}`,
    clientVisible: true,
  });
  if (team) await syncTeamProjects(team.id);
  res.status(201).json({ project });
});

projectsRouter.get('/:id', async (req, res) => {
  const user = currentUser(req);
  const { id } = await loadProject(user, param(req, 'id'));
  const isClient = user.role === 'CLIENT';

  const project = await prisma.project.findUniqueOrThrow({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      company: { select: { id: true, name: true, slug: true } },
      team: { select: { id: true, name: true, color: true, leadId: true, tagline: true, lead: userBrief } },
      manager: userBrief,
      members: { include: { user: userBrief } },
      milestones: { orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] },
      tasks: {
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        // Clients see what is being built and its status, not internal notes or estimates.
        select: isClient
          ? { id: true, title: true, status: true, milestoneId: true, completedAt: true, assignee: { select: { id: true, name: true } } }
          : {
              id: true,
              title: true,
              description: true,
              status: true,
              priority: true,
              estimateHours: true,
              dueDate: true,
              position: true,
              milestoneId: true,
              completedAt: true,
              updatedAt: true,
              assignee: { select: { id: true, name: true } },
            },
      },
    },
  });
  res.json({
    project: { ...project, progress: await progressOf(id) },
    permissions: { canManage: canManageProject(user, project), isClient },
  });
});

projectsRouter.patch('/:id', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const user = currentUser(req);
  const existing = await loadProject(user, param(req, 'id'));
  if (!canManageProject(user, existing)) throw forbidden('Only the project manager can edit this project');
  const { memberIds, ...body } = projectBody.partial().parse(req.body);
  if (body.managerId && user.role !== 'ADMIN') throw forbidden('Only admins can change the project manager');
  await assertClient(user.companyId, body.clientId);
  if (body.managerId) await assertStaff(user.companyId, [body.managerId]);
  await findTeam(user.companyId, body.teamId);

  const project = await prisma.project.update({ where: { id: existing.id }, data: body });
  if (body.teamId && body.teamId !== existing.teamId) await syncTeamProjects(body.teamId);
  if (memberIds) {
    await assertStaff(user.companyId, memberIds);
    const keep = [...new Set([project.managerId, ...memberIds].filter((x): x is string => !!x))];
    await prisma.$transaction([
      prisma.projectMember.deleteMany({ where: { projectId: project.id, userId: { notIn: keep } } }),
      prisma.projectMember.createMany({ data: keep.map((userId) => ({ projectId: project.id, userId })), skipDuplicates: true }),
    ]);
  }
  if (body.status && body.status !== existing.status) {
    await logActivity({
      companyId: user.companyId,
      actorId: user.id,
      projectId: project.id,
      message: `changed project status to ${body.status.replace('_', ' ').toLowerCase()}`,
      clientVisible: true,
    });
  }
  emit([rooms.project(project.id), rooms.projectClient(project.id)], 'project:updated', { projectId: project.id });
  res.json({ project });
});

projectsRouter.get('/:id/activity', async (req, res) => {
  const user = currentUser(req);
  const project = await loadProject(user, param(req, 'id'));
  const activities = await prisma.activity.findMany({
    where: { projectId: project.id, ...(user.role === 'CLIENT' ? { clientVisible: true } : {}) },
    include: { actor: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json({ activities });
});

projectsRouter.get('/:id/comments', async (req, res) => {
  const project = await loadProject(currentUser(req), param(req, 'id'));
  const comments = await prisma.comment.findMany({
    where: { projectId: project.id },
    include: { author: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ comments });
});

projectsRouter.post('/:id/comments', async (req, res) => {
  const user = currentUser(req);
  const project = await loadProject(user, param(req, 'id'));
  const { body } = z.object({ body: z.string().trim().min(1).max(4000) }).parse(req.body);
  const comment = await prisma.comment.create({
    data: { projectId: project.id, authorId: user.id, body },
    include: { author: { select: { id: true, name: true, role: true } } },
  });
  emit([rooms.project(project.id), rooms.projectClient(project.id)], 'comment:new', comment);
  res.status(201).json({ comment });
});

// ---- Milestones -------------------------------------------------------------

const milestoneBody = z.object({
  title: z.string().trim().min(2),
  description: z.string().trim().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'AWAITING_APPROVAL']).optional(),
});

projectsRouter.post('/:id/milestones', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const user = currentUser(req);
  const project = await loadProject(user, param(req, 'id'));
  if (!canManageProject(user, project)) throw forbidden();
  const body = milestoneBody.parse(req.body);
  const position = await prisma.milestone.count({ where: { projectId: project.id } });
  const milestone = await prisma.milestone.create({ data: { ...body, projectId: project.id, position } });
  await logActivity({
    companyId: user.companyId,
    actorId: user.id,
    projectId: project.id,
    message: `added milestone "${milestone.title}"`,
    clientVisible: true,
  });
  emit([rooms.project(project.id), rooms.projectClient(project.id)], 'project:updated', { projectId: project.id });
  res.status(201).json({ milestone });
});

projectsRouter.patch('/:id/milestones/:milestoneId', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const user = currentUser(req);
  const project = await loadProject(user, param(req, 'id'));
  if (!canManageProject(user, project)) throw forbidden();
  const existing = await prisma.milestone.findFirst({ where: { id: param(req, 'milestoneId'), projectId: project.id } });
  if (!existing) throw notFound('Milestone not found');
  const body = milestoneBody.partial().parse(req.body);

  const milestone = await prisma.milestone.update({ where: { id: existing.id }, data: body });
  if (body.status === 'AWAITING_APPROVAL' && existing.status !== 'AWAITING_APPROVAL') {
    await logActivity({
      companyId: user.companyId,
      actorId: user.id,
      projectId: project.id,
      message: `submitted milestone "${milestone.title}" for client approval`,
      clientVisible: true,
    });
  }
  emit([rooms.project(project.id), rooms.projectClient(project.id)], 'project:updated', { projectId: project.id });
  res.json({ milestone });
});

// The client signs off on (or pushes back on) a delivered milestone.
projectsRouter.post('/:id/milestones/:milestoneId/review', requireRole('CLIENT'), async (req, res) => {
  const user = currentUser(req);
  const project = await loadProject(user, param(req, 'id'));
  const existing = await prisma.milestone.findFirst({ where: { id: param(req, 'milestoneId'), projectId: project.id } });
  if (!existing) throw notFound('Milestone not found');
  if (existing.status !== 'AWAITING_APPROVAL') throw badRequest('This milestone is not waiting for your approval');
  const body = z
    .object({ decision: z.enum(['APPROVED', 'CHANGES_REQUESTED']), note: z.string().trim().max(2000).optional() })
    .parse(req.body);

  const milestone = await prisma.milestone.update({
    where: { id: existing.id },
    data: { status: body.decision, clientNote: body.note ?? null },
  });
  await logActivity({
    companyId: project.companyId,
    actorId: user.id,
    projectId: project.id,
    message:
      body.decision === 'APPROVED'
        ? `approved milestone "${milestone.title}"`
        : `requested changes on "${milestone.title}"${body.note ? `: ${body.note}` : ''}`,
    clientVisible: true,
  });
  emit([rooms.project(project.id), rooms.projectClient(project.id)], 'project:updated', { projectId: project.id });
  res.json({ milestone });
});
