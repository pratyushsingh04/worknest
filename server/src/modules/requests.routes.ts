import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import { badRequest, forbidden, notFound, tooManyRequests } from '../lib/errors';
import { hit } from '../lib/rate-limit';
import { logActivity } from '../lib/activity';
import { requestEmail, sendMail } from '../lib/mailer';
import { emit, rooms } from '../lib/socket';
import type { AuthUser } from '../lib/auth';
import { currentUser, param, requireAuth, requireRole } from '../middleware/auth';
import { canManageTeam, syncTeamProjects } from './teams.routes';

export const requestsRouter = Router();
requestsRouter.use(requireAuth);

const requestInclude = {
  client: { select: { id: true, name: true } },
  team: { select: { id: true, name: true, color: true, leadId: true } },
  service: { select: { id: true, title: true } },
  requestedBy: { select: { id: true, name: true } },
  project: { select: { id: true, name: true } },
} as const;

/** Clients see their company's requests; admins see all; team leads see their teams'. */
function scope(user: AuthUser): Prisma.ServiceRequestWhereInput {
  if (user.role === 'CLIENT') return { companyId: user.companyId, clientId: user.clientId ?? '__none__' };
  if (user.role === 'ADMIN') return { companyId: user.companyId };
  return { companyId: user.companyId, team: { leadId: user.id } };
}

requestsRouter.get('/', async (req, res) => {
  const user = currentUser(req);
  const status = z.enum(['NEW', 'IN_REVIEW', 'ACCEPTED', 'DECLINED', 'CONVERTED']).optional().catch(undefined).parse(req.query.status);
  const requests = await prisma.serviceRequest.findMany({
    where: { ...scope(user), ...(status ? { status } : {}) },
    include: requestInclude,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json({ requests });
});

requestsRouter.post('/', requireRole('CLIENT'), async (req, res) => {
  const user = currentUser(req);
  const retry = hit(`request:${user.id}`, 20, 60 * 60 * 1000);
  if (retry) throw tooManyRequests(retry);
  const body = z
    .object({
      teamId: z.string(),
      serviceId: z.string().optional().nullable(),
      title: z.string().trim().min(3).max(120),
      details: z.string().trim().min(10).max(4000),
      budget: z.string().trim().max(60).optional().nullable(),
      deadline: z.coerce.date().optional().nullable(),
    })
    .parse(req.body);

  const team = await prisma.team.findFirst({ where: { id: body.teamId, companyId: user.companyId, visibleToClients: true }, include: { lead: true } });
  if (!team) throw notFound('Team not found');
  const service = body.serviceId ? await prisma.teamService.findFirst({ where: { id: body.serviceId, teamId: team.id } }) : null;
  if (body.serviceId && !service) throw badRequest('That service is not offered by this team');
  const client = await prisma.client.findUniqueOrThrow({ where: { id: user.clientId! } });

  const request = await prisma.serviceRequest.create({
    data: { ...body, serviceId: service?.id ?? null, companyId: user.companyId, clientId: client.id, requestedById: user.id },
    include: requestInclude,
  });

  // Tell the team lead (and admins, through the company feed) right away.
  if (team.lead) {
    emit(rooms.user(team.lead.id), 'notification', { message: `${client.name} sent ${team.name} a new request: ${request.title}` });
    const mail = requestEmail({
      leadName: team.lead.name,
      clientName: client.name,
      teamName: team.name,
      title: request.title,
      details: request.details,
      service: service?.title,
      link: `${config.clientOrigin}/requests`,
    });
    await sendMail({ ...mail, to: team.lead.email, kind: 'request', companyId: user.companyId });
  }
  await logActivity({ companyId: user.companyId, actorId: user.id, message: `requested "${request.title}" from the ${team.name} team` });
  emit(rooms.company(user.companyId), 'request:changed', { id: request.id });
  res.status(201).json({ request });
});

async function loadManageable(user: AuthUser, id: string) {
  const request = await prisma.serviceRequest.findFirst({ where: { id, companyId: user.companyId }, include: { team: true, client: true } });
  if (!request) throw notFound('Request not found');
  if (!canManageTeam(user, request.team)) throw forbidden('Only an admin or the team lead can handle this request');
  return request;
}

requestsRouter.patch('/:id', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const user = currentUser(req);
  const existing = await loadManageable(user, param(req, 'id'));
  if (existing.status === 'CONVERTED') throw badRequest('This request is already a project');
  const body = z.object({ status: z.enum(['IN_REVIEW', 'ACCEPTED', 'DECLINED']), response: z.string().trim().max(2000).optional().nullable() }).parse(req.body);

  const request = await prisma.serviceRequest.update({ where: { id: existing.id }, data: body, include: requestInclude });
  const verb = { IN_REVIEW: 'is reviewing', ACCEPTED: 'accepted', DECLINED: 'declined' }[body.status];
  await logActivity({ companyId: user.companyId, actorId: user.id, message: `${verb} ${existing.client.name}'s request "${existing.title}"` });
  emit([rooms.company(user.companyId)], 'request:changed', { id: request.id });
  const clientUsers = await prisma.user.findMany({ where: { clientId: existing.clientId, isActive: true }, select: { id: true } });
  for (const c of clientUsers) {
    emit(rooms.user(c.id), 'notification', { message: `${existing.team.name} ${verb} your request "${existing.title}"` });
    emit(rooms.user(c.id), 'request:changed', { id: request.id });
  }
  res.json({ request });
});

// Turns a request into a real project owned by the team.
requestsRouter.post('/:id/convert', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const user = currentUser(req);
  const existing = await loadManageable(user, param(req, 'id'));
  if (existing.status === 'CONVERTED' || existing.projectId) throw badRequest('This request is already a project');
  if (existing.status === 'DECLINED') throw badRequest('Re-open the request before starting a project');
  const body = z
    .object({ name: z.string().trim().min(2).max(120).optional(), dueDate: z.coerce.date().optional().nullable() })
    .parse(req.body ?? {});

  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        companyId: user.companyId,
        clientId: existing.clientId,
        teamId: existing.teamId,
        managerId: existing.team.leadId ?? user.id,
        name: body.name ?? existing.title,
        description: existing.details,
        status: 'ACTIVE',
        startDate: new Date(),
        dueDate: body.dueDate ?? existing.deadline,
      },
    });
    await tx.serviceRequest.update({ where: { id: existing.id }, data: { status: 'CONVERTED', projectId: created.id } });
    return created;
  });
  await syncTeamProjects(existing.teamId);
  if (existing.team.leadId !== user.id) {
    await prisma.projectMember.createMany({ data: [{ projectId: project.id, userId: user.id }], skipDuplicates: true });
  }

  await logActivity({
    companyId: user.companyId,
    actorId: user.id,
    projectId: project.id,
    message: `started project ${project.name} with the ${existing.team.name} team`,
    clientVisible: true,
  });
  emit(rooms.company(user.companyId), 'request:changed', { id: existing.id });
  const clientUsers = await prisma.user.findMany({ where: { clientId: existing.clientId, isActive: true }, select: { id: true } });
  for (const c of clientUsers) emit(rooms.user(c.id), 'notification', { message: `Your request "${existing.title}" is now a live project` });
  res.status(201).json({ project });
});
