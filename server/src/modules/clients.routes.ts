import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { logActivity } from '../lib/activity';
import { currentUser, requireAuth, requireRole } from '../middleware/auth';

export const clientsRouter = Router();
clientsRouter.use(requireAuth, requireRole('ADMIN', 'MANAGER'));

clientsRouter.get('/', async (req, res) => {
  const clients = await prisma.client.findMany({
    where: { companyId: currentUser(req).companyId },
    include: {
      // The client's own WorkNest account, when they have one: who to contact.
      account: { select: { id: true, name: true, email: true, phone: true, organisation: true } },
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
