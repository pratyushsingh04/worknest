import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { projectScope } from '../lib/access';
import { localDate } from '../lib/dates';
import { progressFor } from '../lib/progress';
import { currentUser, requireAuth } from '../middleware/auth';
import { leaveBalance } from './leaves.routes';

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get('/', async (req, res) => {
  const user = currentUser(req);
  const company = await prisma.company.findUniqueOrThrow({ where: { id: user.companyId } });
  const today = localDate(new Date(), company.timezone);

  const projects = await prisma.project.findMany({
    where: projectScope(user),
    include: { client: { select: { id: true, name: true } }, manager: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  const progress = await progressFor(projects.map((p) => p.id));
  const projectCards = projects.map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    dueDate: p.dueDate,
    client: p.client,
    manager: p.manager,
    progress: progress[p.id],
  }));

  if (user.role === 'CLIENT') {
    const [awaitingApproval, updates] = await Promise.all([
      prisma.milestone.findMany({
        where: { status: 'AWAITING_APPROVAL', project: projectScope(user) },
        include: { project: { select: { id: true, name: true } } },
      }),
      prisma.activity.findMany({
        where: { clientVisible: true, project: projectScope(user) },
        include: { actor: { select: { id: true, name: true } }, project: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
    ]);
    // The company's delivery record, so clients can judge it on real numbers.
    const [delivered, active, teams, teamsForClient] = await Promise.all([
      prisma.project.count({ where: { companyId: user.companyId, status: 'COMPLETED' } }),
      prisma.project.count({ where: { companyId: user.companyId, status: 'ACTIVE' } }),
      prisma.team.count({ where: { companyId: user.companyId, visibleToClients: true } }),
      prisma.team.findMany({
        where: { companyId: user.companyId, projects: { some: projectScope(user) } },
        select: { id: true, name: true, color: true, lead: { select: { name: true } }, _count: { select: { members: true } } },
      }),
    ]);
    return res.json({ role: user.role, projects: projectCards, awaitingApproval, updates, trackRecord: { delivered, active, teams }, workingTeams: teamsForClient });
  }

  const [myTasks, myAttendance, balance, recentActivity] = await Promise.all([
    prisma.task.findMany({
      where: { assigneeId: user.id, status: { not: 'DONE' } },
      include: { project: { select: { id: true, name: true } } },
      orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
      take: 8,
    }),
    prisma.attendance.findUnique({ where: { userId_date: { userId: user.id, date: today } } }),
    leaveBalance(user.id),
    prisma.activity.findMany({
      where: user.role === 'ADMIN' ? { companyId: user.companyId } : { companyId: user.companyId, project: projectScope(user) },
      include: { actor: { select: { id: true, name: true } }, project: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
  ]);

  let team = null;
  if (user.role === 'ADMIN' || user.role === 'MANAGER') {
    const staffWhere = {
      companyId: user.companyId,
      role: { not: 'CLIENT' as const },
      isActive: true,
      ...(user.role === 'MANAGER' ? { managerId: user.id } : {}),
    };
    const [headcount, present, onLeave, pendingLeaves, clients] = await Promise.all([
      prisma.user.count({ where: staffWhere }),
      prisma.attendance.count({ where: { companyId: user.companyId, date: today, user: staffWhere } }),
      prisma.leave.count({ where: { companyId: user.companyId, status: 'APPROVED', startDate: { lte: today }, endDate: { gte: today }, user: staffWhere } }),
      prisma.leave.count({ where: { companyId: user.companyId, status: 'PENDING', userId: { not: user.id }, user: staffWhere } }),
      prisma.client.count({ where: { companyId: user.companyId } }),
    ]);
    team = { headcount, present, onLeave, absent: Math.max(headcount - present - onLeave, 0), pendingLeaves, clients };
  }

  res.json({ role: user.role, projects: projectCards, myTasks, myAttendance, balance, recentActivity, team });
});
