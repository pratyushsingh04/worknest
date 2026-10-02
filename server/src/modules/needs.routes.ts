import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { badRequest, conflict, forbidden, notFound, tooManyRequests } from '../lib/errors';
import { hit } from '../lib/rate-limit';
import { logActivity } from '../lib/activity';
import { ensureClientRecord } from '../lib/client-record';
import { emit, rooms } from '../lib/socket';
import { currentUser, param, requireAuth, requireRole } from '../middleware/auth';

// A client posts what they need; listed companies see it and answer with a proposal.
export const needsRouter = Router();
needsRouter.use(requireAuth, requireRole('CLIENT', 'ADMIN', 'MANAGER'));

const companyBrief = { select: { id: true, name: true, slug: true, tagline: true, city: true, country: true, industry: true } } as const;
const teamBrief = { select: { id: true, name: true, color: true } } as const;

needsRouter.get('/', async (req, res) => {
  const user = currentUser(req);

  if (user.role === 'CLIENT') {
    const needs = await prisma.need.findMany({
      where: { clientId: user.id },
      include: {
        proposals: {
          include: { company: companyBrief, team: teamBrief, author: { select: { name: true, designation: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
    return res.json({ needs });
  }

  // Companies see every open need, with the client's contact details so they can reach out.
  const [company, needs, teams] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: user.companyId }, select: { isListed: true } }),
    prisma.need.findMany({
      where: { OR: [{ status: 'OPEN' }, { proposals: { some: { companyId: user.companyId } } }] },
      include: {
        client: { select: { id: true, name: true, email: true, phone: true, organisation: true, bio: true } },
        proposals: { where: { companyId: user.companyId }, include: { team: teamBrief, author: { select: { name: true } } } },
        _count: { select: { proposals: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 100,
    }),
    prisma.team.findMany({
      where: { companyId: user.companyId, visibleToClients: true, ...(user.role === 'MANAGER' ? { leadId: user.id } : {}) },
      select: { id: true, name: true, color: true },
      orderBy: { name: 'asc' },
    }),
  ]);
  res.json({
    needs: needs.map(({ proposals, _count, ...n }) => ({ ...n, myProposal: proposals[0] ?? null, proposalCount: _count.proposals })),
    teams,
    isListed: company.isListed,
  });
});

needsRouter.post('/', requireRole('CLIENT'), async (req, res) => {
  const user = currentUser(req);
  const retry = hit(`need:${user.id}`, 10, 60 * 60 * 1000);
  if (retry) throw tooManyRequests(retry);
  const body = z
    .object({
      title: z.string().trim().min(5).max(120),
      details: z.string().trim().min(20).max(4000),
      category: z.string().trim().max(60).optional().nullable(),
      budget: z.string().trim().max(60).optional().nullable(),
      deadline: z.coerce.date().optional().nullable(),
    })
    .parse(req.body);
  const need = await prisma.need.create({ data: { ...body, clientId: user.id }, include: { proposals: true } });
  res.status(201).json({ need });
});

needsRouter.patch('/:id', requireRole('CLIENT'), async (req, res) => {
  const user = currentUser(req);
  const { status } = z.object({ status: z.enum(['OPEN', 'CLOSED']) }).parse(req.body);
  const { count } = await prisma.need.updateMany({ where: { id: param(req, 'id'), clientId: user.id }, data: { status } });
  if (!count) throw notFound('Need not found');
  res.json({ ok: true });
});

needsRouter.delete('/:id', requireRole('CLIENT'), async (req, res) => {
  const { count } = await prisma.need.deleteMany({ where: { id: param(req, 'id'), clientId: currentUser(req).id } });
  if (!count) throw notFound('Need not found');
  res.json({ ok: true });
});

// A company offers to take the work, naming the team that would do it.
needsRouter.post('/:id/proposals', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const user = currentUser(req);
  const retry = hit(`proposal:${user.id}`, 30, 60 * 60 * 1000);
  if (retry) throw tooManyRequests(retry);
  const body = z.object({ teamId: z.string(), message: z.string().trim().min(20).max(3000) }).parse(req.body);

  const [need, company, team] = await Promise.all([
    prisma.need.findFirst({ where: { id: param(req, 'id'), status: 'OPEN' } }),
    prisma.company.findUniqueOrThrow({ where: { id: user.companyId }, select: { name: true, isListed: true } }),
    prisma.team.findFirst({ where: { id: body.teamId, companyId: user.companyId, visibleToClients: true } }),
  ]);
  if (!need) throw notFound('This need is no longer open');
  if (!company.isListed) throw forbidden('Complete your company profile before responding to clients');
  if (!team) throw badRequest('Pick one of your client-facing teams');
  if (user.role === 'MANAGER' && team.leadId !== user.id) throw forbidden('You can only propose a team you lead');
  if (await prisma.proposal.findUnique({ where: { needId_companyId: { needId: need.id, companyId: user.companyId } } })) {
    throw conflict('Your company has already responded to this need');
  }

  const proposal = await prisma.proposal.create({
    data: { needId: need.id, companyId: user.companyId, teamId: team.id, authorId: user.id, message: body.message },
    include: { team: teamBrief, author: { select: { name: true } } },
  });
  await logActivity({ companyId: user.companyId, actorId: user.id, message: `sent a proposal for "${need.title}"` });
  emit(rooms.user(need.clientId), 'notification', { message: `${company.name} responded to "${need.title}"` });
  emit(rooms.user(need.clientId), 'need:changed', { id: need.id });
  res.status(201).json({ proposal });
});

// The client picks a proposal (which opens a request with that team) or turns it down.
needsRouter.post('/proposals/:id/respond', requireRole('CLIENT'), async (req, res) => {
  const user = currentUser(req);
  const { decision } = z.object({ decision: z.enum(['ACCEPT', 'DECLINE']) }).parse(req.body);
  const proposal = await prisma.proposal.findFirst({
    where: { id: param(req, 'id'), need: { clientId: user.id } },
    include: { need: true, team: { select: { id: true, name: true, leadId: true } }, company: { select: { name: true } } },
  });
  if (!proposal) throw notFound('Proposal not found');
  if (proposal.status !== 'PENDING') throw badRequest('You have already answered this proposal');

  if (decision === 'DECLINE') {
    await prisma.proposal.update({ where: { id: proposal.id }, data: { status: 'DECLINED' } });
    emit(rooms.company(proposal.companyId), 'need:changed', { id: proposal.needId });
    return res.json({ ok: true });
  }

  const request = await prisma.$transaction(async (tx) => {
    const client = await ensureClientRecord(proposal.companyId, user.id, tx);
    const created = await tx.serviceRequest.create({
      data: {
        companyId: proposal.companyId,
        clientId: client.id,
        teamId: proposal.teamId,
        requestedById: user.id,
        title: proposal.need.title,
        details: proposal.need.details,
        budget: proposal.need.budget,
        deadline: proposal.need.deadline,
        // Both sides have already agreed, so it skips review.
        status: 'ACCEPTED',
        response: proposal.message,
      },
    });
    await tx.proposal.update({ where: { id: proposal.id }, data: { status: 'ACCEPTED', requestId: created.id } });
    await tx.need.update({ where: { id: proposal.needId }, data: { status: 'CLOSED' } });
    return created;
  });

  await logActivity({ companyId: proposal.companyId, actorId: user.id, message: `accepted the ${proposal.team.name} team's proposal for "${proposal.need.title}"` });
  emit(rooms.company(proposal.companyId), 'need:changed', { id: proposal.needId });
  emit(rooms.company(proposal.companyId), 'request:changed', { id: request.id });
  if (proposal.team.leadId) emit(rooms.user(proposal.team.leadId), 'notification', { message: `Your proposal for "${proposal.need.title}" was accepted. Start the project from Requests.` });
  res.status(201).json({ request });
});
