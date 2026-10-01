import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { conflict, notFound } from '../lib/errors';
import { logActivity } from '../lib/activity';
import { currentUser, param, requireAuth, requireRole } from '../middleware/auth';

export const clientsRouter = Router();
clientsRouter.use(requireAuth, requireRole('ADMIN', 'MANAGER'));

clientsRouter.get('/', async (req, res) => {
  const clients = await prisma.client.findMany({
    where: { companyId: currentUser(req).companyId },
    include: {
      users: { select: { id: true, name: true, email: true, isActive: true } },
      projects: { select: { id: true, name: true, status: true } },
    },
    orderBy: { name: 'asc' },
  });
  res.json({ clients });
});

clientsRouter.post('/', requireRole('ADMIN'), async (req, res) => {
  const admin = currentUser(req);
  const body = z
    .object({
      name: z.string().trim().min(2),
      contactEmail: z.string().trim().toLowerCase().email().optional().or(z.literal('')),
      industry: z.string().trim().optional(),
    })
    .parse(req.body);
  const client = await prisma.client.create({
    data: { ...body, contactEmail: body.contactEmail || null, companyId: admin.companyId },
  });
  await logActivity({ companyId: admin.companyId, actorId: admin.id, message: `onboarded client ${client.name}` });
  res.status(201).json({ client });
});

// Creates a portal login for someone at the client company.
clientsRouter.post('/:id/users', requireRole('ADMIN'), async (req, res) => {
  const admin = currentUser(req);
  const body = z
    .object({
      name: z.string().trim().min(2),
      email: z.string().trim().toLowerCase().email(),
      password: z.string().min(8, 'must be at least 8 characters'),
    })
    .parse(req.body);
  const client = await prisma.client.findFirst({ where: { id: param(req, 'id'), companyId: admin.companyId } });
  if (!client) throw notFound('Client not found');
  if (await prisma.user.findUnique({ where: { email: body.email } })) throw conflict('Email already in use');

  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      passwordHash: await bcrypt.hash(body.password, 10),
      role: 'CLIENT',
      companyId: admin.companyId,
      clientId: client.id,
    },
    select: { id: true, name: true, email: true, isActive: true },
  });
  res.status(201).json({ user });
});
