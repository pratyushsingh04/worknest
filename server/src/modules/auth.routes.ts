import { Router, type Request } from 'express';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AUTH_COOKIE, cookieOptions, signToken } from '../lib/auth';
import { badRequest, conflict, gone, tooManyRequests, unauthorized } from '../lib/errors';
import { blockedFor, hit, reset as resetLimit } from '../lib/rate-limit';
import { hashToken, issuePasswordReset } from '../lib/tokens';
import { passwordResetEmail, sendMail } from '../lib/mailer';
import { logActivity } from '../lib/activity';
import { isProfileComplete, profileSchema } from '../lib/profile';
import { currentUser, param, requireAuth } from '../middleware/auth';

export const authRouter = Router();

const email = z.string().trim().toLowerCase().email();
export const passwordSchema = z
  .string()
  .min(8, 'must be at least 8 characters')
  .regex(/[A-Za-z]/, 'must contain a letter')
  .regex(/\d/, 'must contain a number');

const MAX_FAILED_LOGINS = 8;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

function slugify(name: string) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'company';
  return `${base}-${randomBytes(3).toString('hex')}`;
}

export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  designation: true,
  department: true,
  phone: true,
  organisation: true,
  bio: true,
  isPlatformAdmin: true,
  company: { select: { id: true, name: true, slug: true, isListed: true } },
} as const;

export function requestMeta(req: Request) {
  return { ip: req.ip ?? null, userAgent: req.get('user-agent')?.slice(0, 300) ?? null };
}

/** Signs the user in on this response and records the successful sign-in. */
export async function startSession(req: Request, res: import('express').Response, user: { id: string; companyId: string | null; role: import('@prisma/client').Role; email: string }) {
  res.cookie(AUTH_COOKIE, signToken({ id: user.id, companyId: user.companyId ?? '', role: user.role }), cookieOptions);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
    prisma.loginEvent.create({ data: { userId: user.id, companyId: user.companyId, email: user.email, success: true, ...requestMeta(req) } }),
  ]);
}

authRouter.post('/register-company', async (req, res) => {
  const retry = hit(`register:${req.ip}`, 10, 60 * 60 * 1000);
  if (retry) throw tooManyRequests(retry);
  const body = z
    .object({ companyName: z.string().trim().min(2), name: z.string().trim().min(2), email, password: passwordSchema, designation: z.string().trim().max(80).optional(), profile: profileSchema.partial().optional() })
    .parse(req.body);
  const profile = { tagline: null, about: null, industry: null, specialities: [], offerings: [], city: null, country: null, ...body.profile };

  if (await prisma.user.findUnique({ where: { email: body.email } })) {
    throw conflict('An account with this email already exists');
  }

  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      passwordHash: await bcrypt.hash(body.password, 10),
      role: 'ADMIN',
      designation: body.designation || 'Founder',
      // A complete profile goes straight into the client directory.
      company: { create: { name: body.companyName, slug: slugify(body.companyName), ...profile, contactEmail: profile.contactEmail ?? body.email, isListed: isProfileComplete(profile) } },
    },
    select: { ...publicUserSelect, companyId: true },
  });
  await startSession(req, res, user);
  await logActivity({ companyId: user.companyId!, actorId: user.id, message: `created the ${body.companyName} workspace` });
  res.status(201).json({ user });
});

// Clients sign up on their own and belong to no company.
authRouter.post('/register-client', async (req, res) => {
  const retry = hit(`register:${req.ip}`, 10, 60 * 60 * 1000);
  if (retry) throw tooManyRequests(retry);
  const body = z
    .object({
      name: z.string().trim().min(2).max(80),
      email,
      password: passwordSchema,
      organisation: z.string().trim().max(120).optional(),
      phone: z.string().trim().max(30).optional(),
    })
    .parse(req.body);
  if (await prisma.user.findUnique({ where: { email: body.email } })) throw conflict('An account with this email already exists');

  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      passwordHash: await bcrypt.hash(body.password, 10),
      role: 'CLIENT',
      organisation: body.organisation || null,
      phone: body.phone || null,
    },
    select: { ...publicUserSelect, companyId: true },
  });
  await startSession(req, res, user);
  res.status(201).json({ user });
});

// Anyone can update their own name and contact details.
authRouter.patch('/me', requireAuth, async (req, res) => {
  const body = z
    .object({
      name: z.string().trim().min(2).max(80),
      phone: z.string().trim().max(30).nullable(),
      organisation: z.string().trim().max(120).nullable(),
      bio: z.string().trim().max(600).nullable(),
    })
    .partial()
    .parse(req.body);
  const user = await prisma.user.update({ where: { id: currentUser(req).id }, data: body, select: publicUserSelect });
  res.json({ user });
});

authRouter.post('/login', async (req, res) => {
  const body = z.object({ email, password: z.string().min(1) }).parse(req.body);
  const limitKey = `login:${req.ip}:${body.email}`;
  const wait = blockedFor(limitKey, MAX_FAILED_LOGINS);
  if (wait) throw tooManyRequests(wait);

  const user = await prisma.user.findUnique({ where: { email: body.email } });
  const valid = !!user && (await bcrypt.compare(body.password, user.passwordHash));
  if (!valid || !user.isActive) {
    hit(limitKey, MAX_FAILED_LOGINS, LOGIN_WINDOW_MS);
    await prisma.loginEvent.create({
      data: { email: body.email, success: false, userId: user?.id, companyId: user?.companyId, ...requestMeta(req) },
    });
    // Same message for unknown email and wrong password, so accounts can't be enumerated.
    throw unauthorized(valid ? 'This account has been deactivated' : 'Incorrect email or password');
  }

  resetLimit(limitKey);
  await startSession(req, res, user);
  const me = await prisma.user.findUnique({ where: { id: user.id }, select: publicUserSelect });
  res.json({ user: me });
});

// Short-lived token for the realtime connection. In production the API lives on a
// different domain from the web app, so the session cookie isn't sent with the socket.
authRouter.get('/socket-token', requireAuth, (req, res) => {
  res.json({ token: signToken(currentUser(req), 60) });
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(AUTH_COOKIE, { ...cookieOptions, maxAge: undefined });
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: currentUser(req).id }, select: { ...publicUserSelect, isActive: true } });
  if (!user || !user.isActive) throw unauthorized();
  res.json({ user });
});

// ---- Forgot / reset password ------------------------------------------------

authRouter.post('/forgot-password', async (req, res) => {
  const retry = hit(`forgot:${req.ip}`, 5, 15 * 60 * 1000);
  if (retry) throw tooManyRequests(retry);
  const body = z.object({ email }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (user?.isActive) {
    const link = await issuePasswordReset(user.id);
    const mail = passwordResetEmail({ name: user.name, link });
    await sendMail({ ...mail, to: user.email, kind: 'password_reset', companyId: user.companyId });
  }
  // Same answer whether or not the account exists, so emails can't be probed.
  res.json({ ok: true });
});

async function findUsableReset(token: string) {
  const reset = await prisma.passwordReset.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, name: true, email: true, isActive: true } } },
  });
  if (!reset || reset.usedAt || !reset.user.isActive) throw gone('This link is no longer valid. Request a new one.');
  if (reset.expiresAt < new Date()) throw gone('This link has expired. Request a new one.');
  return reset;
}

authRouter.get('/reset-password/:token', async (req, res) => {
  const reset = await findUsableReset(param(req, 'token'));
  res.json({ name: reset.user.name, email: reset.user.email });
});

authRouter.post('/reset-password/:token', async (req, res) => {
  const retry = hit(`reset:${req.ip}`, 20, 60 * 60 * 1000);
  if (retry) throw tooManyRequests(retry);
  const reset = await findUsableReset(param(req, 'token'));
  const body = z.object({ password: passwordSchema }).parse(req.body);

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.passwordReset.updateMany({ where: { id: reset.id, usedAt: null }, data: { usedAt: new Date() } });
    if (!claimed.count) throw gone('This link has already been used.');
    await tx.user.update({ where: { id: reset.user.id }, data: { passwordHash: await bcrypt.hash(body.password, 10) } });
    await tx.passwordReset.deleteMany({ where: { userId: reset.user.id, usedAt: null } });
  });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: reset.user.id } });
  resetLimit(`login:${req.ip}:${user.email}`);
  await startSession(req, res, user);
  res.json({ user: await prisma.user.findUnique({ where: { id: user.id }, select: publicUserSelect }) });
});

authRouter.post('/change-password', requireAuth, async (req, res) => {
  const body = z.object({ currentPassword: z.string().min(1), newPassword: passwordSchema }).parse(req.body);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: currentUser(req).id } });
  if (!(await bcrypt.compare(body.currentPassword, user.passwordHash))) throw badRequest('Current password is incorrect');
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(body.newPassword, 10) } });
  res.json({ ok: true });
});
