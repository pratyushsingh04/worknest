import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { betaTool } from '@anthropic-ai/sdk/helpers/beta/json-schema';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { projectScope } from '../lib/access';
import type { AuthUser } from '../lib/auth';
import { localDate } from '../lib/dates';
import { HttpError, tooManyRequests } from '../lib/errors';
import { progressFor } from '../lib/progress';
import { hit } from '../lib/rate-limit';
import { currentUser, requireAuth } from '../middleware/auth';
import { leaveBalance } from './leaves.routes';

// The in-app assistant. It answers questions about the signed-in person's own work by
// calling read-only tools, each scoped exactly like the REST API. It cannot change anything.
export const assistantRouter = Router();
assistantRouter.use(requireAuth);

const MODEL = 'claude-opus-5-5';
const enabled = () => !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
let client: Anthropic | null = null;
const anthropic = () => (client ??= new Anthropic());

const json = (value: unknown) => JSON.stringify(value);
const noInput = { type: 'object', properties: {}, additionalProperties: false } as const;
const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/** Projects the person may see, with progress, the client and the team on each. */
async function projectList(user: AuthUser) {
  const projects = await prisma.project.findMany({
    where: projectScope(user),
    select: {
      id: true,
      name: true,
      status: true,
      dueDate: true,
      client: { select: { name: true } },
      company: { select: { name: true } },
      team: { select: { name: true, lead: { select: { name: true } } } },
      manager: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const progress = await progressFor(projects.map((p) => p.id));
  return projects.map((p) => ({
    name: p.name,
    status: p.status,
    due: day(p.dueDate),
    percentComplete: progress[p.id].percent,
    tasks: { total: progress[p.id].total, done: progress[p.id].done, inProgress: progress[p.id].inProgress },
    client: p.client?.name ?? null,
    company: p.company.name,
    team: p.team?.name ?? null,
    lead: p.team?.lead?.name ?? p.manager?.name ?? null,
  }));
}

/** One project in detail: milestones, open tasks and the latest updates the person is allowed to see. */
async function projectDetail(user: AuthUser, name: string) {
  const project = await prisma.project.findFirst({
    where: { AND: [projectScope(user), { name: { contains: name.trim(), mode: 'insensitive' } }] },
    select: {
      id: true,
      name: true,
      status: true,
      description: true,
      startDate: true,
      dueDate: true,
      company: { select: { name: true } },
      client: { select: { name: true } },
      team: { select: { name: true, lead: { select: { name: true } } } },
      members: { select: { user: { select: { name: true, designation: true } } } },
      milestones: { orderBy: { position: 'asc' }, select: { title: true, status: true, dueDate: true } },
    },
  });
  if (!project) return { error: `No project matching "${name}" that this person can see.` };

  const isClient = user.role === 'CLIENT';
  const [progress, tasks, updates] = await Promise.all([
    progressFor([project.id]),
    prisma.task.findMany({
      where: { projectId: project.id, status: { not: 'DONE' } },
      // Clients see what is being built and its status, never internal priorities or estimates.
      select: { title: true, status: true, assignee: { select: { name: true } }, ...(isClient ? {} : { priority: true, dueDate: true }) },
      orderBy: { updatedAt: 'desc' },
      take: 25,
    }),
    prisma.activity.findMany({
      where: { projectId: project.id, ...(isClient ? { clientVisible: true } : {}) },
      select: { message: true, createdAt: true, actor: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
  ]);
  const { id, ...rest } = project;
  return {
    ...rest,
    startDate: day(project.startDate),
    dueDate: day(project.dueDate),
    milestones: project.milestones.map((m) => ({ ...m, dueDate: day(m.dueDate) })),
    members: project.members.map((m) => m.user),
    percentComplete: progress[id].percent,
    openTasks: tasks,
    latestUpdates: updates.map((u) => ({ who: u.actor?.name ?? null, what: u.message, when: u.createdAt.toISOString() })),
  };
}

export function staffTools(user: AuthUser) {
  const leads = user.role === 'ADMIN' || user.role === 'MANAGER';
  const tools = [
    betaTool({
      name: 'get_my_tasks',
      description: "The signed-in person's own open tasks across all projects, with status, priority and due date. Use for questions like 'what should I work on' or 'what is overdue'.",
      inputSchema: noInput,
      run: async () =>
        json(
          (
            await prisma.task.findMany({
              where: { assigneeId: user.id, status: { not: 'DONE' } },
              select: { title: true, status: true, priority: true, dueDate: true, project: { select: { name: true } } },
              orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
              take: 50,
            })
          ).map((t) => ({ ...t, dueDate: day(t.dueDate), project: t.project.name })),
        ),
    }),
    betaTool({
      name: 'list_projects',
      description: 'Every project the signed-in person can see, with status, percent complete, due date, client, team and lead. Use for portfolio questions and to find project names.',
      inputSchema: noInput,
      run: async () => json(await projectList(user)),
    }),
    betaTool({
      name: 'get_project',
      description: 'One project in detail: milestones and their approval status, open tasks with assignees, team members and the latest updates. Pass any distinctive part of the project name.',
      inputSchema: { type: 'object', properties: { name: { type: 'string', description: 'Project name or part of it' } }, required: ['name'], additionalProperties: false },
      run: async (input) => json(await projectDetail(user, String(input.name ?? ''))),
    }),
    betaTool({
      name: 'get_my_attendance_and_leave',
      description: "The signed-in person's check-in for today, their attendance over the last 14 days, their leave balance and their recent leave requests.",
      inputSchema: noInput,
      run: async () => {
        const company = await prisma.company.findUniqueOrThrow({ where: { id: user.companyId }, select: { timezone: true, workStartTime: true } });
        const today = localDate(new Date(), company.timezone);
        const [recent, balance, leaves] = await Promise.all([
          prisma.attendance.findMany({ where: { userId: user.id }, select: { date: true, status: true, checkIn: true, checkOut: true }, orderBy: { date: 'desc' }, take: 14 }),
          leaveBalance(user.id),
          prisma.leave.findMany({ where: { userId: user.id }, select: { type: true, startDate: true, endDate: true, days: true, status: true }, orderBy: { createdAt: 'desc' }, take: 6 }),
        ]);
        return json({ today, workStartsAt: company.workStartTime, checkedInToday: recent.some((r) => r.date === today), last14Days: recent, leaveBalance: balance, recentLeaveRequests: leaves });
      },
    }),
  ];
  if (!leads) return tools;

  // Managers see the people who report to them; admins see the whole company.
  const staffWhere = { companyId: user.companyId, role: { not: 'CLIENT' as const }, isActive: true, ...(user.role === 'MANAGER' ? { managerId: user.id } : {}) };
  return [
    ...tools,
    betaTool({
      name: 'get_team_today',
      description: "Who is in today, who is late, who is on approved leave and who has not checked in, for the people this person is responsible for. Also the leave requests waiting for a decision.",
      inputSchema: noInput,
      run: async () => {
        const company = await prisma.company.findUniqueOrThrow({ where: { id: user.companyId }, select: { timezone: true } });
        const today = localDate(new Date(), company.timezone);
        const [people, attendance, onLeave, pending] = await Promise.all([
          prisma.user.findMany({ where: staffWhere, select: { id: true, name: true, designation: true, department: true }, take: 300 }),
          prisma.attendance.findMany({ where: { companyId: user.companyId, date: today, user: staffWhere }, select: { userId: true, status: true } }),
          prisma.leave.findMany({ where: { companyId: user.companyId, status: 'APPROVED', startDate: { lte: today }, endDate: { gte: today }, user: staffWhere }, select: { userId: true, type: true } }),
          prisma.leave.findMany({ where: { companyId: user.companyId, status: 'PENDING', user: staffWhere }, select: { type: true, startDate: true, endDate: true, days: true, reason: true, user: { select: { name: true } } }, take: 30 }),
        ]);
        const state = (id: string) => attendance.find((a) => a.userId === id)?.status ?? (onLeave.some((l) => l.userId === id) ? 'ON_LEAVE' : 'NOT_CHECKED_IN');
        return json({
          date: today,
          headcount: people.length,
          people: people.map(({ id, ...p }) => ({ ...p, today: state(id) })),
          leaveRequestsWaiting: pending.map((l) => ({ ...l, user: l.user.name })),
        });
      },
    }),
    betaTool({
      name: 'list_client_requests',
      description: 'Work clients have asked this company for (to teams this person leads, or all of them for an admin), with status, budget, deadline and who asked.',
      inputSchema: noInput,
      run: async () =>
        json(
          (
            await prisma.serviceRequest.findMany({
              where: { companyId: user.companyId, ...(user.role === 'MANAGER' ? { team: { leadId: user.id } } : {}) },
              select: { title: true, status: true, budget: true, deadline: true, createdAt: true, client: { select: { name: true } }, team: { select: { name: true } } },
              orderBy: { createdAt: 'desc' },
              take: 30,
            })
          ).map((r) => ({ ...r, deadline: day(r.deadline), createdAt: day(r.createdAt), client: r.client.name, team: r.team.name })),
        ),
    }),
    betaTool({
      name: 'list_open_client_needs',
      description: 'What clients across the platform are currently looking for (open needs any listed company can answer), with category, budget and how many companies have already responded.',
      inputSchema: noInput,
      run: async () =>
        json(
          (
            await prisma.need.findMany({
              where: { status: 'OPEN' },
              select: { title: true, details: true, category: true, budget: true, deadline: true, createdAt: true, _count: { select: { proposals: true } }, proposals: { where: { companyId: user.companyId }, select: { status: true } } },
              orderBy: { createdAt: 'desc' },
              take: 20,
            })
          ).map(({ _count, proposals, ...n }) => ({ ...n, details: n.details.slice(0, 400), deadline: day(n.deadline), createdAt: day(n.createdAt), responses: _count.proposals, weResponded: proposals.length > 0 })),
        ),
    }),
  ];
}

export function clientTools(user: AuthUser) {
  return [
    betaTool({
      name: 'list_my_projects',
      description: "Every project being delivered to the signed-in client, across all companies, with percent complete, status, due date, the company and the team working on it.",
      inputSchema: noInput,
      run: async () => json(await projectList(user)),
    }),
    betaTool({
      name: 'get_project',
      description: 'One of the client\'s projects in detail: milestones (including any waiting for their approval), what is being built, who is on the team and the latest updates. Pass any distinctive part of the project name.',
      inputSchema: { type: 'object', properties: { name: { type: 'string', description: 'Project name or part of it' } }, required: ['name'], additionalProperties: false },
      run: async (input) => json(await projectDetail(user, String(input.name ?? ''))),
    }),
    betaTool({
      name: 'search_companies',
      description: 'Search the directory of companies listed on WorkNest by what they do. Returns each match with its tagline, specialities, location, teams and delivery record. Pass an empty query to list the newest companies.',
      inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'A skill, industry, city or kind of work, e.g. "mobile app"' } }, required: ['query'], additionalProperties: false },
      run: async (input) => {
        const words = String(input.query ?? '').toLowerCase().split(/\s+/).filter(Boolean);
        const listed = await prisma.company.findMany({
          where: { isListed: true },
          select: {
            name: true,
            tagline: true,
            industry: true,
            specialities: true,
            offerings: true,
            city: true,
            country: true,
            teams: { where: { visibleToClients: true }, select: { name: true, skills: true, services: { select: { title: true, startingPrice: true } } } },
            _count: { select: { projects: { where: { status: 'COMPLETED' } } } },
          },
          orderBy: { createdAt: 'desc' },
          take: 500,
        });
        const matches = listed.filter((c) => {
          const haystack = [c.name, c.tagline, c.industry, c.city, c.country, ...c.specialities, ...c.offerings, ...c.teams.flatMap((t) => [t.name, ...t.skills, ...t.services.map((s) => s.title)])].join(' ').toLowerCase();
          return words.every((w) => haystack.includes(w));
        });
        return json({ totalListed: listed.length, matches: matches.slice(0, 8).map(({ _count, ...c }) => ({ ...c, projectsDelivered: _count.projects })) });
      },
    }),
    betaTool({
      name: 'list_my_requests_and_needs',
      description: "The requests this client has sent to companies and where each stands, plus the needs they have posted and how many proposals each has received.",
      inputSchema: noInput,
      run: async () => {
        const [requests, needs] = await Promise.all([
          prisma.serviceRequest.findMany({
            where: { client: { accountId: user.id } },
            select: { title: true, status: true, response: true, createdAt: true, company: { select: { name: true } }, team: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
            take: 20,
          }),
          prisma.need.findMany({
            where: { clientId: user.id },
            select: { title: true, status: true, createdAt: true, proposals: { select: { status: true, message: true, company: { select: { name: true } }, team: { select: { name: true } } } } },
            orderBy: { createdAt: 'desc' },
            take: 10,
          }),
        ]);
        return json({
          requests: requests.map((r) => ({ ...r, createdAt: day(r.createdAt), company: r.company.name, team: r.team.name })),
          needs: needs.map((n) => ({ ...n, createdAt: day(n.createdAt), proposals: n.proposals.map((p) => ({ ...p, message: p.message.slice(0, 300), company: p.company.name, team: p.team.name })) })),
        });
      },
    }),
  ];
}

async function systemPrompt(user: AuthUser) {
  const me = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { name: true, designation: true, organisation: true, company: { select: { name: true, timezone: true } } } });
  const who =
    user.role === 'CLIENT'
      ? `${me.name}, a client${me.organisation ? ` from ${me.organisation}` : ''}. They hire companies through WorkNest and follow their projects here.`
      : `${me.name}${me.designation ? `, ${me.designation}` : ''} at ${me.company?.name}. Their access level is ${user.role.toLowerCase()}.`;
  return `You are the assistant built into WorkNest, a platform where service companies run their work (attendance, leave, teams, projects) and their clients follow it.

You are talking with ${who}
Today is ${localDate(new Date(), me.company?.timezone ?? 'Asia/Kolkata')}.

Answer questions about this person's own work using the tools. The tools return live data and already apply this person's permissions, so anything they return is theirs to see and anything they do not return is not available to this person. When a question needs data, call a tool before answering; never estimate numbers, names, dates or statuses from memory. If a tool returns nothing relevant, say so plainly.

You can read but not change anything. When someone asks you to do something (assign a task, approve leave, approve a milestone, send a request), tell them where in WorkNest to do it, in one sentence.

Write the way a sharp colleague would in chat: lead with the answer, keep it short, use a short list only when there are several items, and name people, projects and dates exactly as the data gives them. Reply in the language the person writes in. Plain text with simple Markdown lists and bold is fine; no tables or headings.`;
}

assistantRouter.get('/status', (_req, res) => {
  res.json({ enabled: enabled() });
});

const chatBody = z.object({
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(4000) }))
    .min(1)
    .max(30)
    .refine((m) => m[m.length - 1].role === 'user', 'The last message must be from the user'),
});

assistantRouter.post('/chat', async (req, res) => {
  const user = currentUser(req);
  if (!enabled()) throw new HttpError(503, 'The assistant is not switched on for this server yet.');
  const retry = hit(`assistant:${user.id}`, 40, 60 * 60 * 1000);
  if (retry) throw tooManyRequests(retry);
  const { messages } = chatBody.parse(req.body);

  try {
    const final = await anthropic().beta.messages.toolRunner({
      model: MODEL,
      max_tokens: 16000,
      // Short factual answers over a handful of tool calls: low effort keeps the chat quick.
      output_config: { effort: 'low' },
      // If a safety classifier declines, the API retries on a fallback model in the same call.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: await systemPrompt(user),
      tools: user.role === 'CLIENT' ? clientTools(user) : staffTools(user),
      messages,
      max_iterations: 8,
    });

    if (final.stop_reason === 'refusal') return res.json({ reply: "I can't help with that one. Ask me about your projects, tasks, team or requests instead." });
    const reply = final.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    res.json({ reply: reply || "I couldn't put an answer together for that. Try asking it another way." });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
      console.error('Assistant: the AI API key was rejected.');
      throw new HttpError(503, 'The assistant is not set up correctly. Ask your admin to check the AI key on the server.');
    }
    if (err instanceof Anthropic.RateLimitError) throw new HttpError(429, 'The assistant is busy right now. Try again in a minute.');
    if (err instanceof Anthropic.APIError) {
      console.error('Assistant API error:', err.status, err.message);
      throw new HttpError(502, 'The assistant could not answer just now. Please try again.');
    }
    throw err;
  }
});
