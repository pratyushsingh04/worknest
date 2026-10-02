import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { notFound } from '../lib/errors';
import { projectScope } from '../lib/access';
import { publicCompanySelect } from '../lib/profile';
import { progressFor } from '../lib/progress';
import { currentUser, param, requireAuth, requireRole } from '../middleware/auth';
import { showcase } from './teams.routes';

// Everything a client sees: the directory of companies, and their own work across them.
export const marketRouter = Router();
marketRouter.use(requireAuth, requireRole('CLIENT'));

const staff = { isActive: true, role: { not: 'CLIENT' as const } };

const cardSelect = {
  ...publicCompanySelect,
  _count: {
    select: {
      users: { where: staff },
      teams: { where: { visibleToClients: true } },
      projects: { where: { status: 'COMPLETED' as const } },
    },
  },
} as const;

type CardRow = Prisma.CompanyGetPayload<{ select: typeof cardSelect }>;
const toCard = ({ _count, about, ...c }: CardRow) => ({ ...c, about: about?.slice(0, 220) ?? null, people: _count.users, teams: _count.teams, delivered: _count.projects });

marketRouter.get('/companies', async (req, res) => {
  const { q, speciality } = z
    .object({ q: z.string().trim().max(80).optional(), speciality: z.string().trim().max(60).optional() })
    .parse(req.query);

  // Tags live in arrays, which the database can only match exactly, so the search runs here.
  // The directory is small enough to read whole.
  const listed = await prisma.company.findMany({
    where: { isListed: true },
    select: { ...cardSelect, teams: { where: { visibleToClients: true }, select: { name: true, skills: true, services: { select: { title: true } } } } },
    orderBy: { createdAt: 'desc' },
    take: 1000,
  });

  const words = (q ?? '').toLowerCase().split(/s+/).filter(Boolean);
  const wanted = speciality?.toLowerCase();
  const companies = listed.filter((c) => {
    if (wanted && !c.specialities.some((s) => s.toLowerCase() === wanted)) return false;
    if (!words.length) return true;
    const haystack = [c.name, c.tagline, c.industry, c.about, c.city, c.country, ...c.specialities, ...c.offerings, ...c.teams.flatMap((t) => [t.name, ...t.skills, ...t.services.map((sv) => sv.title)])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return words.every((w) => haystack.includes(w));
  });

  // The most common specialities across the directory, for the filter chips.
  const counts = new Map<string, number>();
  for (const c of listed) for (const sp of c.specialities) counts.set(sp, (counts.get(sp) ?? 0) + 1);
  const specialities = [...counts.entries()].sort((x, y) => y[1] - x[1]).slice(0, 14).map(([name]) => name);

  res.json({ companies: companies.slice(0, 60).map(({ teams: _teams, ...c }) => toCard(c)), specialities, total: listed.length });
});

marketRouter.get('/companies/:slug', async (req, res) => {
  const user = currentUser(req);
  const company = await prisma.company.findFirst({ where: { slug: param(req, 'slug'), isListed: true }, select: publicCompanySelect });
  if (!company) throw notFound('Company not found');

  const [teams, people, delivered, active, clients, myProjects, myRequests] = await Promise.all([
    showcase({ companyId: company.id }),
    prisma.user.findMany({
      where: { companyId: company.id, ...staff },
      select: { id: true, name: true, designation: true, department: true, role: true },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
      take: 200,
    }),
    prisma.project.count({ where: { companyId: company.id, status: 'COMPLETED' } }),
    prisma.project.count({ where: { companyId: company.id, status: 'ACTIVE' } }),
    prisma.client.count({ where: { companyId: company.id } }),
    prisma.project.findMany({
      where: { companyId: company.id, ...projectScope(user) },
      select: { id: true, name: true, status: true, dueDate: true, team: { select: { id: true, name: true, color: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.serviceRequest.findMany({
      where: { companyId: company.id, client: { accountId: user.id }, status: { in: ['NEW', 'IN_REVIEW', 'ACCEPTED'] } },
      select: { id: true, title: true, status: true, team: { select: { name: true } }, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  const progress = await progressFor(myProjects.map((p) => p.id));

  res.json({
    company,
    teams,
    // Departments are how the company itself groups its people.
    people: people.map(({ role, ...p }) => ({ ...p, isLeadership: role === 'ADMIN' })),
    trackRecord: { delivered, active, clients, people: people.length, teams: teams.length },
    mine: { projects: myProjects.map((p) => ({ ...p, progress: progress[p.id] })), requests: myRequests },
  });
});

// The client's home: their work everywhere, what needs them, and who is new.
marketRouter.get('/home', async (req, res) => {
  const user = currentUser(req);
  const scope = projectScope(user);

  const [projects, awaitingApproval, updates, requests, needs, newest, listed] = await Promise.all([
    prisma.project.findMany({
      where: scope,
      select: {
        id: true,
        name: true,
        status: true,
        dueDate: true,
        startDate: true,
        company: { select: { id: true, name: true, slug: true } },
        team: { select: { id: true, name: true, color: true, lead: { select: { name: true } }, _count: { select: { members: true } } } },
        activities: { where: { clientVisible: true }, orderBy: { createdAt: 'desc' }, take: 1, select: { message: true, createdAt: true, actor: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.milestone.findMany({
      where: { status: 'AWAITING_APPROVAL', project: scope },
      select: { id: true, title: true, dueDate: true, project: { select: { id: true, name: true, company: { select: { name: true } } } } },
    }),
    prisma.activity.findMany({
      where: { clientVisible: true, project: scope },
      select: { id: true, message: true, createdAt: true, actor: { select: { id: true, name: true } }, project: { select: { id: true, name: true, company: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
    prisma.serviceRequest.findMany({
      where: { client: { accountId: user.id }, status: { in: ['NEW', 'IN_REVIEW', 'ACCEPTED'] } },
      select: { id: true, title: true, status: true, createdAt: true, company: { select: { name: true, slug: true } }, team: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
    prisma.need.findMany({
      where: { clientId: user.id, status: 'OPEN' },
      select: { id: true, title: true, createdAt: true, _count: { select: { proposals: true } } },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
    prisma.company.findMany({ where: { isListed: true }, select: cardSelect, orderBy: { createdAt: 'desc' }, take: 6 }),
    prisma.company.count({ where: { isListed: true } }),
  ]);
  const progress = await progressFor(projects.map((p) => p.id));

  res.json({
    projects: projects.map(({ activities, ...p }) => ({ ...p, progress: progress[p.id], lastUpdate: activities[0] ?? null })),
    awaitingApproval,
    updates,
    requests,
    needs: needs.map(({ _count, ...n }) => ({ ...n, proposals: _count.proposals })),
    newest: newest.map(toCard),
    totals: { companies: listed, active: projects.filter((p) => p.status !== 'COMPLETED').length, delivered: projects.filter((p) => p.status === 'COMPLETED').length },
  });
});
