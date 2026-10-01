import { Router } from 'express';
import { z } from 'zod';
import type { LeaveType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { badRequest, forbidden, notFound } from '../lib/errors';
import { workingDays } from '../lib/dates';
import { logActivity } from '../lib/activity';
import { emit, rooms } from '../lib/socket';
import { currentUser, param, requireAuth, requireRole } from '../middleware/auth';
import type { AuthUser } from '../lib/auth';

export const leavesRouter = Router();
leavesRouter.use(requireAuth, requireRole('ADMIN', 'MANAGER', 'EMPLOYEE'));

/** Yearly allowance per leave type. UNPAID is unlimited. */
export const LEAVE_POLICY: Record<Exclude<LeaveType, 'UNPAID'>, number> = {
  CASUAL: 12,
  SICK: 8,
  EARNED: 15,
};

const leaveInclude = {
  user: { select: { id: true, name: true, designation: true } },
  reviewer: { select: { id: true, name: true } },
} as const;

export async function leaveBalance(userId: string, year = new Date().getFullYear()) {
  const used = await prisma.leave.groupBy({
    by: ['type'],
    // Pending requests count too, so people can't over-book while waiting for approval.
    where: { userId, status: { in: ['APPROVED', 'PENDING'] }, startDate: { startsWith: String(year) } },
    _sum: { days: true },
  });
  return (Object.keys(LEAVE_POLICY) as (keyof typeof LEAVE_POLICY)[]).map((type) => {
    const taken = used.find((u) => u.type === type)?._sum.days ?? 0;
    return { type, allowed: LEAVE_POLICY[type], used: taken, remaining: LEAVE_POLICY[type] - taken };
  });
}

/** Admins review everyone; managers review their direct reports. */
function reviewableWhere(user: AuthUser) {
  return {
    companyId: user.companyId,
    userId: { not: user.id },
    ...(user.role === 'MANAGER' ? { user: { managerId: user.id } } : {}),
  };
}

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use YYYY-MM-DD');

leavesRouter.get('/balance', async (req, res) => {
  res.json({ balance: await leaveBalance(currentUser(req).id) });
});

leavesRouter.get('/mine', async (req, res) => {
  const leaves = await prisma.leave.findMany({ where: { userId: currentUser(req).id }, include: leaveInclude, orderBy: { createdAt: 'desc' } });
  res.json({ leaves });
});

leavesRouter.post('/', async (req, res) => {
  const user = currentUser(req);
  const body = z
    .object({ type: z.enum(['CASUAL', 'SICK', 'EARNED', 'UNPAID']), startDate: ymd, endDate: ymd, reason: z.string().trim().min(3).max(1000) })
    .parse(req.body);
  if (body.endDate < body.startDate) throw badRequest('End date must be on or after start date');
  if (body.startDate.slice(0, 4) !== body.endDate.slice(0, 4)) throw badRequest('Please split leave that crosses into a new year');

  const days = workingDays(body.startDate, body.endDate);
  if (days === 0) throw badRequest('The selected dates are all weekends');

  const overlap = await prisma.leave.findFirst({
    where: { userId: user.id, status: { in: ['PENDING', 'APPROVED'] }, startDate: { lte: body.endDate }, endDate: { gte: body.startDate } },
  });
  if (overlap) throw badRequest('You already have leave applied for some of these dates');

  if (body.type !== 'UNPAID') {
    const balance = (await leaveBalance(user.id, Number(body.startDate.slice(0, 4)))).find((b) => b.type === body.type)!;
    if (days > balance.remaining) throw badRequest(`Only ${balance.remaining} ${body.type.toLowerCase()} leave day(s) left`);
  }

  const leave = await prisma.leave.create({ data: { ...body, days, companyId: user.companyId, userId: user.id }, include: leaveInclude });
  const applicant = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { managerId: true } });
  if (applicant.managerId) {
    emit(rooms.user(applicant.managerId), 'notification', { message: `${leave.user.name} applied for ${days} day(s) of leave` });
  }
  emit(rooms.company(user.companyId), 'leave:changed', { id: leave.id });
  res.status(201).json({ leave });
});

leavesRouter.post('/:id/cancel', async (req, res) => {
  const user = currentUser(req);
  const leave = await prisma.leave.findFirst({ where: { id: param(req, 'id'), userId: user.id } });
  if (!leave) throw notFound('Leave request not found');
  if (leave.status !== 'PENDING') throw badRequest('Only pending requests can be cancelled');
  await prisma.leave.delete({ where: { id: leave.id } });
  emit(rooms.company(user.companyId), 'leave:changed', { id: leave.id });
  res.json({ ok: true });
});

leavesRouter.get('/team', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const user = currentUser(req);
  const status = z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional().catch(undefined).parse(req.query.status);
  const leaves = await prisma.leave.findMany({
    where: { ...reviewableWhere(user), ...(status ? { status } : {}) },
    include: leaveInclude,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json({ leaves });
});

leavesRouter.post('/:id/review', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const user = currentUser(req);
  const body = z.object({ decision: z.enum(['APPROVED', 'REJECTED']), note: z.string().trim().max(1000).optional() }).parse(req.body);
  const leave = await prisma.leave.findFirst({ where: { id: param(req, 'id'), ...reviewableWhere(user) } });
  if (!leave) throw notFound('Leave request not found');
  if (leave.userId === user.id) throw forbidden('You cannot approve your own leave');
  if (leave.status !== 'PENDING') throw badRequest('This request has already been reviewed');

  const updated = await prisma.leave.update({
    where: { id: leave.id },
    data: { status: body.decision, reviewerId: user.id, reviewNote: body.note ?? null },
    include: leaveInclude,
  });
  emit(rooms.user(leave.userId), 'notification', {
    message: `Your leave (${leave.startDate} to ${leave.endDate}) was ${body.decision.toLowerCase()}`,
  });
  emit(rooms.company(user.companyId), 'leave:changed', { id: leave.id });
  await logActivity({
    companyId: user.companyId,
    actorId: user.id,
    message: `${body.decision.toLowerCase()} ${updated.user.name}'s leave request`,
  });
  res.json({ leave: updated });
});
