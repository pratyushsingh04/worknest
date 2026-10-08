import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { badRequest, conflict, notFound } from '../lib/errors';
import { logActivity } from '../lib/activity';
import { currentUser, param, requireAuth, requireRole, forgetSession } from '../middleware/auth';

export const usersRouter = Router();
usersRouter.use(requireAuth, requireRole('ADMIN', 'MANAGER', 'EMPLOYEE'));

const staffSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  designation: true,
  department: true,
  phone: true,
  isActive: true,
  joinedAt: true,
  manager: { select: { id: true, name: true } },
} as const;

usersRouter.get('/', async (req, res) => {
  const user = currentUser(req);
  const users = await prisma.user.findMany({
    where: {
      companyId: user.companyId,
      role: { not: 'CLIENT' },
      ...(user.role === 'ADMIN' ? {} : { isActive: true }),
    },
    select: staffSelect,
    orderBy: { name: 'asc' },
  });
  res.json({ users });
});

const staffBody = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']),
  designation: z.string().trim().optional(),
  department: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  managerId: z.string().optional().nullable(),
  password: z.string().min(8, 'must be at least 8 characters'),
});

async function assertManagerInCompany(companyId: string, managerId?: string | null) {
  if (!managerId) return;
  const manager = await prisma.user.findFirst({ where: { id: managerId, companyId, role: { in: ['ADMIN', 'MANAGER'] } } });
  if (!manager) throw badRequest('Reporting manager must be an admin or manager in your company');
}

usersRouter.post('/', requireRole('ADMIN'), async (req, res) => {
  const admin = currentUser(req);
  const body = staffBody.parse(req.body);
  if (await prisma.user.findUnique({ where: { email: body.email } })) throw conflict('Email already in use');
  await assertManagerInCompany(admin.companyId, body.managerId);

  const { password, ...rest } = body;
  const user = await prisma.user.create({
    data: { ...rest, companyId: admin.companyId, passwordHash: await bcrypt.hash(password, 10) },
    select: staffSelect,
  });
  await logActivity({ companyId: admin.companyId, actorId: admin.id, message: `added ${user.name} as ${user.role.toLowerCase()}` });
  res.status(201).json({ user });
});

usersRouter.patch('/:id', requireRole('ADMIN'), async (req, res) => {
  const admin = currentUser(req);
  const body = staffBody
    .omit({ email: true, password: true })
    .partial()
    .extend({ isActive: z.boolean().optional() })
    .parse(req.body);
  const target = await prisma.user.findFirst({ where: { id: param(req, 'id'), companyId: admin.companyId, role: { not: 'CLIENT' } } });
  if (!target) throw notFound('Employee not found');
  if (target.id === admin.id && (body.isActive === false || (body.role && body.role !== 'ADMIN'))) {
    throw badRequest('You cannot deactivate or demote yourself');
  }
  if (body.managerId === target.id) throw badRequest('Someone cannot report to themselves');
  await assertManagerInCompany(admin.companyId, body.managerId);

  const user = await prisma.user.update({ where: { id: target.id }, data: body, select: staffSelect });
  forgetSession(target.id);
  res.json({ user });
});
