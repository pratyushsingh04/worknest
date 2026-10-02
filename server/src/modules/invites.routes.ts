import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import { badRequest, conflict, gone, notFound, tooManyRequests } from '../lib/errors';
import { hit } from '../lib/rate-limit';
import { logActivity } from '../lib/activity';
import { emailEnabled, inviteEmail, sendMail } from '../lib/mailer';
import { hashToken, newToken } from '../lib/tokens';
import { currentUser, param, requireAuth, requireRole } from '../middleware/auth';
import { passwordSchema, publicUserSelect, startSession } from './auth.routes';

export const invitesRouter = Router();

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const inviteLink = (token: string) => `${config.clientOrigin}/join/${token}`;

const inviteSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  designation: true,
  department: true,
  projectIds: true,
  expiresAt: true,
  acceptedAt: true,
  createdAt: true,
  invitedBy: { select: { id: true, name: true } },
} as const;

type InviteRow = { id: string; email: string; name: string | null; role: string; designation: string | null; department: string | null; projectIds: string[]; managerId?: string | null };

/** Human sentence describing where the invitee will land, for the email. */
async function placementText(companyId: string, invite: InviteRow) {
  const [projects, manager] = await Promise.all([
    prisma.project.findMany({ where: { id: { in: invite.projectIds }, companyId }, select: { name: true } }),
    invite.managerId ? prisma.user.findUnique({ where: { id: invite.managerId }, select: { name: true } }) : null,
  ]);
  const parts = [`You'll join as ${invite.designation ? `${invite.designation}` : invite.role.toLowerCase()}`];
  if (invite.department) parts.push(`in ${invite.department}`);
  if (manager) parts.push(`reporting to ${manager.name}`);
  let text = parts.join(' ') + '.';
  if (projects.length) text += ` You'll be added to ${projects.map((p) => p.name).join(', ')}.`;
  return text;
}

async function emailInvite(companyId: string, inviterName: string, invite: InviteRow, link: string) {
  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { name: true } });
  const mail = inviteEmail({
    inviterName,
    companyName: company.name,
    placement: await placementText(companyId, invite),
    link,
    isClient: false,
  });
  return sendMail({ ...mail, to: invite.email, kind: 'invite', companyId });
}

// ---- Admin side -------------------------------------------------------------

invitesRouter.get('/', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const invites = await prisma.invite.findMany({
    where: { companyId: currentUser(req).companyId },
    select: inviteSelect,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json({ invites, emailEnabled: emailEnabled() });
});

invitesRouter.post('/', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const admin = currentUser(req);
  const body = z
    .object({
      email: z.string().trim().toLowerCase().email(),
      name: z.string().trim().min(2).optional(),
      role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']),
      designation: z.string().trim().max(80).optional(),
      department: z.string().trim().max(80).optional(),
      managerId: z.string().optional(),
      projectIds: z.array(z.string()).max(50).default([]),
    })
    .parse(req.body);

  if (await prisma.user.findUnique({ where: { email: body.email } })) throw conflict('Someone with this email already has an account');
  {
    if (body.managerId) {
      const manager = await prisma.user.findFirst({ where: { id: body.managerId, companyId: admin.companyId, role: { in: ['ADMIN', 'MANAGER'] }, isActive: true } });
      if (!manager) throw badRequest('Reporting manager must be an active admin or manager');
    }
    const projectIds = [...new Set(body.projectIds)];
    if (projectIds.length && (await prisma.project.count({ where: { id: { in: projectIds }, companyId: admin.companyId } })) !== projectIds.length) {
      throw badRequest('One of the selected projects was not found');
    }
    body.projectIds = projectIds;
  }

  // Re-inviting the same email replaces the old, unused link.
  await prisma.invite.deleteMany({ where: { companyId: admin.companyId, email: body.email, acceptedAt: null } });
  const { token, tokenHash, expiresAt } = newToken(INVITE_TTL_MS);
  const invite = await prisma.invite.create({
    data: {
      companyId: admin.companyId,
      invitedById: admin.id,
      email: body.email,
      name: body.name,
      role: body.role,
      designation: body.designation || null,
      department: body.department || null,
      managerId: body.managerId || null,
      projectIds: body.projectIds,
      tokenHash,
      expiresAt,
    },
    select: { ...inviteSelect, managerId: true },
  });

  const inviter = await prisma.user.findUniqueOrThrow({ where: { id: admin.id }, select: { name: true } });
  const link = inviteLink(token);
  const emailStatus = await emailInvite(admin.companyId, inviter.name, invite, link);
  await logActivity({ companyId: admin.companyId, actorId: admin.id, message: `invited ${body.email} as ${body.role.toLowerCase()}` });
  res.status(201).json({ invite, link, emailStatus });
});

// The raw link is shown only once, so "resend" issues (and emails) a new one.
invitesRouter.post('/:id/regenerate', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const admin = currentUser(req);
  const existing = await prisma.invite.findFirst({
    where: { id: param(req, 'id'), companyId: admin.companyId, acceptedAt: null },
  });
  if (!existing) throw notFound('Invite not found or already used');
  const { token, tokenHash, expiresAt } = newToken(INVITE_TTL_MS);
  const invite = await prisma.invite.update({ where: { id: existing.id }, data: { tokenHash, expiresAt }, select: inviteSelect });
  const inviter = await prisma.user.findUniqueOrThrow({ where: { id: admin.id }, select: { name: true } });
  const link = inviteLink(token);
  const emailStatus = await emailInvite(admin.companyId, inviter.name, existing, link);
  res.json({ invite, link, emailStatus });
});

invitesRouter.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const admin = currentUser(req);
  const { count } = await prisma.invite.deleteMany({ where: { id: param(req, 'id'), companyId: admin.companyId, acceptedAt: null } });
  if (!count) throw notFound('Invite not found or already used');
  res.json({ ok: true });
});

// ---- Public side (the person who received the link) -------------------------

async function findUsableInvite(token: string) {
  const invite = await prisma.invite.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { company: { select: { id: true, name: true } }, invitedBy: { select: { name: true } } },
  });
  if (!invite) throw notFound('This invite link is not valid');
  if (invite.acceptedAt) throw gone('This invite has already been used. Sign in instead.');
  if (invite.expiresAt < new Date()) throw gone('This invite has expired. Ask your admin for a new link.');
  return invite;
}

invitesRouter.get('/token/:token', async (req, res) => {
  const invite = await findUsableInvite(param(req, 'token'));
  const [projects, manager] = await Promise.all([
    prisma.project.findMany({ where: { id: { in: invite.projectIds }, companyId: invite.companyId }, select: { id: true, name: true } }),
    invite.managerId ? prisma.user.findUnique({ where: { id: invite.managerId }, select: { name: true } }) : null,
  ]);
  res.json({
    invite: {
      email: invite.email,
      name: invite.name,
      role: invite.role,
      designation: invite.designation,
      department: invite.department,
      manager: manager?.name ?? null,
      projects,
      company: invite.company,
      invitedBy: invite.invitedBy?.name ?? null,
      expiresAt: invite.expiresAt,
    },
  });
});

invitesRouter.post('/token/:token/accept', async (req, res) => {
  const retry = hit(`accept:${req.ip}`, 20, 60 * 60 * 1000);
  if (retry) throw tooManyRequests(retry);
  const invite = await findUsableInvite(param(req, 'token'));
  const body = z.object({ name: z.string().trim().min(2), password: passwordSchema }).parse(req.body);
  if (await prisma.user.findUnique({ where: { email: invite.email } })) throw conflict('An account with this email already exists. Sign in instead.');

  // A manager or project may have been removed since the invite was sent.
  const [manager, projects] = await Promise.all([
    invite.managerId ? prisma.user.findFirst({ where: { id: invite.managerId, companyId: invite.companyId, isActive: true } }) : null,
    prisma.project.findMany({ where: { id: { in: invite.projectIds }, companyId: invite.companyId }, select: { id: true, name: true } }),
  ]);

  const user = await prisma.$transaction(async (tx) => {
    // Claim the invite first so two tabs can't both use it.
    const claimed = await tx.invite.updateMany({ where: { id: invite.id, acceptedAt: null }, data: { acceptedAt: new Date() } });
    if (!claimed.count) throw gone('This invite has already been used. Sign in instead.');
    return tx.user.create({
      data: {
        companyId: invite.companyId,
        email: invite.email,
        name: body.name,
        role: invite.role,
        designation: invite.designation,
        department: invite.department,
        managerId: manager?.id ?? null,
        passwordHash: await bcrypt.hash(body.password, 10),
        memberships: { create: projects.map((p) => ({ projectId: p.id })) },
      },
      select: { ...publicUserSelect, companyId: true },
    });
  });

  await startSession(req, res, user);
  await logActivity({ companyId: invite.companyId, actorId: user.id, message: `joined the workspace${invite.department ? ` in ${invite.department}` : ''}` });
  for (const p of projects) {
    await logActivity({ companyId: invite.companyId, actorId: user.id, projectId: p.id, message: 'joined the project team' });
  }
  res.status(201).json({ user });
});
