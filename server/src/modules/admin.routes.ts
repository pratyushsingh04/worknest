import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { localDate } from '../lib/dates';
import { progressFor } from '../lib/progress';
import { currentUser, param, requireAuth, requireRole } from '../middleware/auth';
import { emailEnabled } from '../lib/mailer';
import { notFound } from '../lib/errors';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('ADMIN'));

const TREND_DAYS = 14;

adminRouter.get('/overview', async (req, res) => {
  const { companyId } = currentUser(req);
  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });
  const now = new Date();
  const today = localDate(now, company.timezone);
  const days = Array.from({ length: TREND_DAYS }, (_, i) => localDate(new Date(now.getTime() - (TREND_DAYS - 1 - i) * 86_400_000), company.timezone));
  const staff = { companyId, role: { not: 'CLIENT' as const }, isActive: true };
  const openTask = { project: { companyId }, status: { not: 'DONE' as const } };

  const [
    headcount,
    clients,
    projects,
    tasksByStatus,
    overdueTasks,
    attendanceRows,
    onLeaveToday,
    pendingLeaves,
    pendingInvites,
    departments,
    leaveByType,
    workloadRows,
    recentLogins,
    failedLogins7d,
  ] = await Promise.all([
    prisma.user.count({ where: staff }),
    prisma.client.count({ where: { companyId } }),
    prisma.project.findMany({
      where: { companyId },
      select: { id: true, name: true, status: true, dueDate: true, client: { select: { name: true } } },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.task.groupBy({ by: ['status'], where: { project: { companyId } }, _count: { _all: true } }),
    prisma.task.count({ where: { ...openTask, dueDate: { lt: now } } }),
    prisma.attendance.groupBy({ by: ['date', 'status'], where: { companyId, date: { in: days } }, _count: { _all: true } }),
    prisma.leave.count({ where: { companyId, status: 'APPROVED', startDate: { lte: today }, endDate: { gte: today } } }),
    prisma.leave.count({ where: { companyId, status: 'PENDING' } }),
    prisma.invite.count({ where: { companyId, acceptedAt: null, expiresAt: { gt: now } } }),
    prisma.user.groupBy({ by: ['department'], where: staff, _count: { _all: true } }),
    prisma.leave.groupBy({ by: ['type'], where: { companyId, status: 'APPROVED', startDate: { startsWith: today.slice(0, 4) } }, _sum: { days: true } }),
    prisma.task.groupBy({ by: ['assigneeId'], where: { ...openTask, assigneeId: { not: null } }, _count: { _all: true } }),
    prisma.loginEvent.findMany({
      where: { companyId },
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    prisma.loginEvent.count({ where: { companyId, success: false, createdAt: { gte: new Date(now.getTime() - 7 * 86_400_000) } } }),
  ]);

  const progress = await progressFor(projects.map((p) => p.id));
  const active = projects.filter((p) => p.status === 'ACTIVE');
  const avgProgress = active.length ? Math.round(active.reduce((sum, p) => sum + progress[p.id].percent, 0) / active.length) : 0;

  const workloadUsers = await prisma.user.findMany({
    where: { id: { in: workloadRows.map((w) => w.assigneeId!) } },
    select: { id: true, name: true, designation: true },
  });
  const workload = workloadRows
    .map((w) => ({ user: workloadUsers.find((u) => u.id === w.assigneeId)!, openTasks: w._count._all }))
    .filter((w) => w.user)
    .sort((a, b) => b.openTasks - a.openTasks)
    .slice(0, 8);

  const count = (date: string, status: 'PRESENT' | 'LATE') =>
    attendanceRows.find((r) => r.date === date && r.status === status)?._count._all ?? 0;
  const presentToday = count(today, 'PRESENT') + count(today, 'LATE');

  res.json({
    kpis: {
      headcount,
      clients,
      activeProjects: active.length,
      avgProgress,
      openTasks: tasksByStatus.filter((t) => t.status !== 'DONE').reduce((s, t) => s + t._count._all, 0),
      overdueTasks,
      presentToday,
      onLeaveToday,
      pendingLeaves,
      pendingInvites,
      failedLogins7d,
    },
    attendanceTrend: days.map((date) => ({ date, onTime: count(date, 'PRESENT'), late: count(date, 'LATE') })),
    tasksByStatus: (['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] as const).map((status) => ({
      status,
      count: tasksByStatus.find((t) => t.status === status)?._count._all ?? 0,
    })),
    projects: projects.map((p) => ({
      ...p,
      progress: progress[p.id],
      overdue: p.status !== 'COMPLETED' && !!p.dueDate && p.dueDate < now,
    })),
    departments: departments
      .map((d) => ({ department: d.department ?? 'Unassigned', count: d._count._all }))
      .sort((a, b) => b.count - a.count),
    leaveByType: (['CASUAL', 'SICK', 'EARNED', 'UNPAID'] as const).map((type) => ({
      type,
      days: leaveByType.find((l) => l.type === type)?._sum.days ?? 0,
    })),
    workload,
    recentLogins,
  });
});

// Full audit trail: every action anyone took in the workspace.
adminRouter.get('/audit', async (req, res) => {
  const { companyId } = currentUser(req);
  const query = z
    .object({ q: z.string().trim().max(100).optional(), cursor: z.string().optional(), take: z.coerce.number().int().min(1).max(100).default(40) })
    .parse(req.query);
  const items = await prisma.activity.findMany({
    where: {
      companyId,
      ...(query.q
        ? {
            OR: [
              { message: { contains: query.q, mode: 'insensitive' } },
              { actor: { name: { contains: query.q, mode: 'insensitive' } } },
              { project: { name: { contains: query.q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    },
    include: { actor: { select: { id: true, name: true, role: true } }, project: { select: { id: true, name: true } } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: query.take + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  const hasMore = items.length > query.take;
  res.json({ items: items.slice(0, query.take), nextCursor: hasMore ? items[query.take - 1].id : null });
});

// Security log of sign-in attempts.
adminRouter.get('/logins', async (req, res) => {
  const { companyId } = currentUser(req);
  const query = z
    .object({ failedOnly: z.enum(['true', 'false']).optional(), cursor: z.string().optional(), take: z.coerce.number().int().min(1).max(100).default(40) })
    .parse(req.query);
  const items = await prisma.loginEvent.findMany({
    where: { companyId, ...(query.failedOnly === 'true' ? { success: false } : {}) },
    include: { user: { select: { id: true, name: true, role: true } } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: query.take + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  const hasMore = items.length > query.take;
  res.json({ items: items.slice(0, query.take), nextCursor: hasMore ? items[query.take - 1].id : null });
});

// Everyone with an account, including clients, with their last sign-in.
adminRouter.get('/users', async (req, res) => {
  const users = await prisma.user.findMany({
    where: { companyId: currentUser(req).companyId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      designation: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      client: { select: { name: true } },
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  });
  res.json({ users });
});

// Every email the workspace sent (or saved, when SMTP isn't configured).
adminRouter.get('/emails', async (req, res) => {
  const { companyId } = currentUser(req);
  const query = z.object({ cursor: z.string().optional(), take: z.coerce.number().int().min(1).max(100).default(30) }).parse(req.query);
  const items = await prisma.emailLog.findMany({
    where: { companyId },
    select: { id: true, to: true, subject: true, kind: true, status: true, error: true, createdAt: true },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: query.take + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  const hasMore = items.length > query.take;
  res.json({ items: items.slice(0, query.take), nextCursor: hasMore ? items[query.take - 1].id : null, emailEnabled: emailEnabled() });
});

adminRouter.get('/emails/:id', async (req, res) => {
  const email = await prisma.emailLog.findFirst({ where: { id: param(req, 'id'), companyId: currentUser(req).companyId } });
  if (!email) throw notFound('Email not found');
  res.json({ email });
});
