import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { isProfileComplete, missingProfileFields, profileSchema } from '../lib/profile';
import { currentUser, requireAuth, requireRole } from '../middleware/auth';

export const companyRouter = Router();
companyRouter.use(requireAuth, requireRole('ADMIN', 'MANAGER', 'EMPLOYEE'));

function isValidTimezone(tz: string) {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

companyRouter.get('/', async (req, res) => {
  const company = await prisma.company.findUniqueOrThrow({ where: { id: currentUser(req).companyId } });
  res.json({ company, missing: missingProfileFields(company) });
});

companyRouter.patch('/', requireRole('ADMIN'), async (req, res) => {
  const body = z
    .object({
      name: z.string().trim().min(2),
      timezone: z.string().refine(isValidTimezone, 'unknown timezone'),
      workStartTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'use HH:mm'),
      officeLat: z.number().min(-90).max(90).nullable(),
      officeLng: z.number().min(-180).max(180).nullable(),
      officeRadiusM: z.number().int().min(25).max(5000),
    })
    .merge(profileSchema)
    .partial()
    .parse(req.body);
  const id = currentUser(req).companyId;
  const saved = await prisma.company.update({ where: { id }, data: body });
  // Listing follows the profile: complete means visible to clients, incomplete means hidden.
  const complete = isProfileComplete(saved);
  const company = saved.isListed === complete ? saved : await prisma.company.update({ where: { id }, data: { isListed: complete } });
  res.json({ company, missing: missingProfileFields(company) });
});
