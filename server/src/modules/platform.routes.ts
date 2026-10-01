import { Router, type NextFunction, type Request, type Response } from 'express';
import { prisma } from '../lib/prisma';
import { forbidden } from '../lib/errors';
import { currentUser, requireAuth } from '../middleware/auth';

// The WorkNest owner's view across every tenant. Checked against the database
// on every request rather than trusting a claim in the token.
export const platformRouter = Router();

async function requirePlatformAdmin(req: Request, _res: Response, next: NextFunction) {
  const user = await prisma.user.findUnique({ where: { id: currentUser(req).id }, select: { isPlatformAdmin: true, isActive: true } });
  if (!user?.isPlatformAdmin || !user.isActive) return next(forbidden());
  next();
}

platformRouter.use(requireAuth, requirePlatformAdmin);

const SIGNUP_DAYS = 30;

platformRouter.get('/overview', async (_req, res) => {
  const now = new Date();
  const since = new Date(now.getTime() - SIGNUP_DAYS * 86_400_000);
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);

  const [companies, users, projects, tasks, logins7d, lastActivity, recentCompanies, usersByRole] = await Promise.all([
    prisma.company.count(),
    prisma.user.count(),
    prisma.project.count(),
    prisma.task.count(),
    prisma.loginEvent.count({ where: { success: true, createdAt: { gte: weekAgo } } }),
    prisma.activity.groupBy({ by: ['companyId'], _max: { createdAt: true } }),
    prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        _count: { select: { users: true, projects: true, clients: true } },
        users: { where: { role: 'ADMIN' }, orderBy: { createdAt: 'asc' }, take: 1, select: { name: true, email: true } },
      },
    }),
    prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
  ]);

  const signups = await prisma.company.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } });
  const signupTrend = Array.from({ length: SIGNUP_DAYS }, (_, i) => {
    const day = new Date(since.getTime() + (i + 1) * 86_400_000).toISOString().slice(0, 10);
    return { date: day, companies: signups.filter((s) => s.createdAt.toISOString().slice(0, 10) === day).length };
  });

  res.json({
    totals: { companies, users, projects, tasks, logins7d },
    usersByRole: usersByRole.map((u) => ({ role: u.role, count: u._count._all })),
    signupTrend,
    companies: recentCompanies.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      createdAt: c.createdAt,
      owner: c.users[0] ?? null,
      counts: c._count,
      lastActivityAt: lastActivity.find((a) => a.companyId === c.id)?._max.createdAt ?? null,
    })),
  });
});
