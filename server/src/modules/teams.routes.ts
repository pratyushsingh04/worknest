import { Router } from 'express';
import { z } from 'zod';
import type { Team } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { badRequest, forbidden, notFound } from '../lib/errors';
import { logActivity } from '../lib/activity';
import { progressFor } from '../lib/progress';
import type { AuthUser } from '../lib/auth';
import { currentUser, param, requireAuth, requireRole } from '../middleware/auth';

export const teamsRouter = Router();
teamsRouter.use(requireAuth);

export const TEAM_COLORS = ['indigo', 'emerald', 'sky', 'amber', 'rose', 'slate'] as const;

/** Admins manage every team; a team lead manages their own. */
export function canManageTeam(user: AuthUser, team: Pick<Team, 'leadId'>) {
  return user.role === 'ADMIN' || team.leadId === user.id;
}

async function loadTeam(user: AuthUser, id: string) {
  const team = await prisma.team.findFirst({ where: { id, companyId: user.companyId } });
  if (!team) throw notFound('Team not found');
  return team;
}

async function assertLead(companyId: string, leadId?: string | null) {
  if (!leadId) return;
  const lead = await prisma.user.findFirst({ where: { id: leadId, companyId, isActive: true, role: { in: ['ADMIN', 'MANAGER'] } } });
  if (!lead) throw badRequest('The team lead must be an active admin or manager');
}

async function assertStaff(companyId: string, userIds: string[]) {
  if (!userIds.length) return;
  const count = await prisma.user.count({ where: { id: { in: userIds }, companyId, isActive: true, role: { not: 'CLIENT' } } });
  if (count !== new Set(userIds).size) throw badRequest('Team members must be active employees of your company');
}

/** Everyone in the team (lead included) joins every project the team owns. */
export async function syncTeamProjects(teamId: string) {
  const team = await prisma.team.findUniqueOrThrow({ where: { id: teamId }, include: { members: true, projects: { select: { id: true } } } });
  const userIds = [...new Set([...team.members.map((m) => m.userId), ...(team.leadId ? [team.leadId] : [])])];
  if (!userIds.length || !team.projects.length) return;
  await prisma.projectMember.createMany({
    data: team.projects.flatMap((p) => userIds.map((userId) => ({ projectId: p.id, userId }))),
    skipDuplicates: true,
  });
}

const personBrief = { select: { id: true, name: true, designation: true } } as const;
const serviceOrder = { orderBy: [{ position: 'asc' as const }, { createdAt: 'asc' as const }] };

/** What a client is allowed to see about a team. */
async function showcase(where: { companyId: string; id?: string }) {
  const teams = await prisma.team.findMany({
    where: { ...where, visibleToClients: true },
    select: {
      id: true,
      name: true,
      tagline: true,
      description: true,
      color: true,
      skills: true,
      lead: { select: { name: true, designation: true } },
      members: { select: { user: { select: { name: true, designation: true } } } },
      services: { ...serviceOrder, select: { id: true, title: true, description: true, deliverables: true, turnaround: true, startingPrice: true } },
      _count: { select: { projects: { where: { status: 'COMPLETED' } } } },
    },
    orderBy: { name: 'asc' },
  });
  return teams.map(({ _count, ...t }) => ({ ...t, projectsDelivered: _count.projects }));
}

teamsRouter.get('/', async (req, res) => {
  const user = currentUser(req);
  if (user.role === 'CLIENT') return res.json({ teams: await showcase({ companyId: user.companyId }) });

  const teams = await prisma.team.findMany({
    where: { companyId: user.companyId },
    include: {
      lead: personBrief,
      members: { include: { user: personBrief }, orderBy: { addedAt: 'asc' } },
      services: { ...serviceOrder, select: { id: true, title: true, description: true, deliverables: true, turnaround: true, startingPrice: true } },
      _count: { select: { services: true, projects: true, requests: { where: { status: { in: ['NEW', 'IN_REVIEW'] } } } } },
    },
    orderBy: { name: 'asc' },
  });
  res.json({ teams, canCreate: user.role === 'ADMIN' });
});

teamsRouter.get('/:id', async (req, res) => {
  const user = currentUser(req);
  const id = param(req, 'id');
  if (user.role === 'CLIENT') {
    const [team] = await showcase({ companyId: user.companyId, id });
    if (!team) throw notFound('Team not found');
    return res.json({ team });
  }

  const team = await prisma.team.findFirst({
    where: { id, companyId: user.companyId },
    include: {
      lead: personBrief,
      members: { include: { user: personBrief }, orderBy: { addedAt: 'asc' } },
      services: serviceOrder,
      projects: { include: { client: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
    },
  });
  if (!team) throw notFound('Team not found');

  const memberIds = [...new Set([...team.members.map((m) => m.userId), ...(team.leadId ? [team.leadId] : [])])];
  const projectIds = team.projects.map((p) => p.id);
  const [progress, openTasks, recentTasks] = await Promise.all([
    progressFor(projectIds),
    prisma.task.groupBy({ by: ['assigneeId'], where: { projectId: { in: projectIds }, assigneeId: { in: memberIds }, status: { not: 'DONE' } }, _count: { _all: true } }),
    prisma.task.findMany({
      where: { projectId: { in: projectIds } },
      include: { assignee: { select: { id: true, name: true } }, project: { select: { id: true, name: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 12,
    }),
  ]);

  res.json({
    team: {
      ...team,
      projects: team.projects.map((p) => ({ ...p, progress: progress[p.id] })),
      members: team.members.map((m) => ({ ...m, openTasks: openTasks.find((o) => o.assigneeId === m.userId)?._count._all ?? 0 })),
      recentTasks,
    },
    permissions: { canManage: canManageTeam(user, team), canEditLead: user.role === 'ADMIN' },
  });
});

const teamBody = z.object({
  name: z.string().trim().min(2).max(60),
  tagline: z.string().trim().max(120).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  color: z.enum(TEAM_COLORS).optional(),
  leadId: z.string().optional().nullable(),
  skills: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
  visibleToClients: z.boolean().optional(),
  memberIds: z.array(z.string()).max(200).optional(),
});

teamsRouter.post('/', requireRole('ADMIN'), async (req, res) => {
  const admin = currentUser(req);
  const { memberIds = [], ...body } = teamBody.parse(req.body);
  await assertLead(admin.companyId, body.leadId);
  await assertStaff(admin.companyId, memberIds);

  const team = await prisma.team.create({
    data: {
      ...body,
      skills: [...new Set(body.skills ?? [])],
      companyId: admin.companyId,
      members: { create: [...new Set([...memberIds, ...(body.leadId ? [body.leadId] : [])])].map((userId) => ({ userId })) },
    },
  });
  await logActivity({ companyId: admin.companyId, actorId: admin.id, message: `created the ${team.name} team` });
  res.status(201).json({ team });
});

teamsRouter.patch('/:id', async (req, res) => {
  const user = currentUser(req);
  const team = await loadTeam(user, param(req, 'id'));
  if (!canManageTeam(user, team)) throw forbidden('Only an admin or the team lead can edit this team');
  const { memberIds, ...body } = teamBody.partial().parse(req.body);
  if (body.leadId !== undefined && user.role !== 'ADMIN') throw forbidden('Only admins can change the team lead');
  await assertLead(user.companyId, body.leadId);

  const updated = await prisma.team.update({
    where: { id: team.id },
    data: { ...body, ...(body.skills ? { skills: [...new Set(body.skills)] } : {}) },
  });
  if (memberIds) await setMembers(user, updated.id, memberIds);
  else if (body.leadId) {
    await prisma.teamMember.createMany({ data: [{ teamId: team.id, userId: body.leadId }], skipDuplicates: true });
    await syncTeamProjects(team.id);
  }
  res.json({ team: updated });
});

async function setMembers(user: AuthUser, teamId: string, memberIds: string[]) {
  await assertStaff(user.companyId, memberIds);
  const team = await prisma.team.findUniqueOrThrow({ where: { id: teamId }, include: { members: true } });
  const keep = [...new Set([...memberIds, ...(team.leadId ? [team.leadId] : [])])];
  const added = keep.filter((id) => !team.members.some((m) => m.userId === id));
  await prisma.$transaction([
    prisma.teamMember.deleteMany({ where: { teamId, userId: { notIn: keep } } }),
    prisma.teamMember.createMany({ data: keep.map((userId) => ({ teamId, userId })), skipDuplicates: true }),
  ]);
  await syncTeamProjects(teamId);
  if (added.length) {
    const names = await prisma.user.findMany({ where: { id: { in: added } }, select: { name: true } });
    await logActivity({ companyId: user.companyId, actorId: user.id, message: `added ${names.map((n) => n.name).join(', ')} to the ${team.name} team` });
  }
}

teamsRouter.put('/:id/members', async (req, res) => {
  const user = currentUser(req);
  const team = await loadTeam(user, param(req, 'id'));
  if (!canManageTeam(user, team)) throw forbidden('Only an admin or the team lead can change members');
  const { userIds } = z.object({ userIds: z.array(z.string()).max(200) }).parse(req.body);
  await setMembers(user, team.id, userIds);
  res.json({ ok: true });
});

teamsRouter.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  const user = currentUser(req);
  const team = await loadTeam(user, param(req, 'id'));
  await prisma.team.delete({ where: { id: team.id } });
  await logActivity({ companyId: user.companyId, actorId: user.id, message: `deleted the ${team.name} team` });
  res.json({ ok: true });
});

// ---- Services the team offers -----------------------------------------------

const serviceBody = z.object({
  title: z.string().trim().min(2).max(80),
  description: z.string().trim().min(5).max(1500),
  deliverables: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
  turnaround: z.string().trim().max(40).optional().nullable(),
  startingPrice: z.number().int().min(0).max(100_000_000).optional().nullable(),
});

teamsRouter.post('/:id/services', async (req, res) => {
  const user = currentUser(req);
  const team = await loadTeam(user, param(req, 'id'));
  if (!canManageTeam(user, team)) throw forbidden('Only an admin or the team lead can edit services');
  const body = serviceBody.parse(req.body);
  const position = await prisma.teamService.count({ where: { teamId: team.id } });
  const service = await prisma.teamService.create({ data: { ...body, teamId: team.id, position } });
  res.status(201).json({ service });
});

teamsRouter.patch('/:id/services/:serviceId', async (req, res) => {
  const user = currentUser(req);
  const team = await loadTeam(user, param(req, 'id'));
  if (!canManageTeam(user, team)) throw forbidden('Only an admin or the team lead can edit services');
  const existing = await prisma.teamService.findFirst({ where: { id: param(req, 'serviceId'), teamId: team.id } });
  if (!existing) throw notFound('Service not found');
  const service = await prisma.teamService.update({ where: { id: existing.id }, data: serviceBody.partial().parse(req.body) });
  res.json({ service });
});

teamsRouter.delete('/:id/services/:serviceId', async (req, res) => {
  const user = currentUser(req);
  const team = await loadTeam(user, param(req, 'id'));
  if (!canManageTeam(user, team)) throw forbidden('Only an admin or the team lead can edit services');
  const { count } = await prisma.teamService.deleteMany({ where: { id: param(req, 'serviceId'), teamId: team.id } });
  if (!count) throw notFound('Service not found');
  res.json({ ok: true });
});
