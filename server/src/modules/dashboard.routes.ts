import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { projectScope } from '../lib/access';
import { localDate } from '../lib/dates';
import { progressFor } from '../lib/progress';
import { missingProfileFields } from '../lib/profile';
import { currentUser, requireAuth, requireStaff } from '../middleware/auth';
import { leaveBalance } from './leaves.routes';

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth, requireStaff);

dashboardRouter.get('/', async (req, res) => {
  const user = currentUser(req);
  // Everything that does not depend on something else is asked for at the same time.
  const [company, projects, myTasks, balance, recentActivity] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: user.companyId } }),
    prisma.project.findMany({
      where: projectScope(user),
      include: { client: { select: { id: true, name: true } }, manager: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.task.findMany({
      where: { assigneeId: user.id, status: { not: 'DONE' } },
      include: { project: { select: { id: true, name: true } } },
      orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
      take: 8,
    }),
    leaveBalance(user.id),
    prisma.activity.findMany({
      where: user.role === 'ADMIN' ? { companyId: user.companyId } : { companyId: user.companyId, project: projectScope(user) },
      include: { actor: { select: { id: true, name: true } }, project: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
  ]);
  const today = localDate(new Date(), company.timezone);
  const leads = user.role === 'ADMIN' || user.role === 'MANAGER';
  const staffWhere = {
    companyId: user.companyId,
    role: { not: 'CLIENT' as const },
    isActive: true,
    ...(user.role === 'MANAGER' ? { managerId: user.id } : {}),
  };

  const [progress, myAttendance, counts] = await Promise.all([
    progressFor(projects.map((p) => p.id)),
    prisma.attendance.findUnique({ where: { userId_date: { userId: user.id, date: today } } }),
    leads
      ? Promise.all([
          prisma.user.count({ where: staffWhere }),
          prisma.attendance.count({ where: { companyId: user.companyId, date: today, user: staffWhere } }),
          prisma.leave.count({ where: { companyId: user.companyId, status: 'APPROVED', startDate: { lte: today }, endDate: { gte: today }, user: staffWhere } }),
          prisma.leave.count({ where: { companyId: user.companyId, status: 'PENDING', userId: { not: user.id }, user: staffWhere } }),
          prisma.client.count({ where: { companyId: user.companyId } }),
        ])
      : null,
  ]);
  const projectCards = projects.map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    dueDate: p.dueDate,
    client: p.client,
    manager: p.manager,
    progress: progress[p.id],
  }));

  let team = null;
  if (counts) {
    const [headcount, present, onLeave, pendingLeaves, clients] = counts;
    team = { headcount, present, onLeave, absent: Math.max(headcount - present - onLeave, 0), pendingLeaves, clients };
  }

  // Admins are nudged to finish the public profile; until then clients can't find the company.
  const listing = user.role === 'ADMIN' ? { isListed: company.isListed, missing: missingProfileFields(company) } : null;
  res.json({ role: user.role, projects: projectCards, myTasks, myAttendance, balance, recentActivity, team, listing });
});
