import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { badRequest, conflict } from '../lib/errors';
import { localDate, localMinutes, parseHHmm } from '../lib/dates';
import { distanceMetres } from '../lib/geo';
import { emit, rooms } from '../lib/socket';
import { currentUser, requireAuth, requireRole } from '../middleware/auth';
import type { AuthUser } from '../lib/auth';

export const attendanceRouter = Router();
attendanceRouter.use(requireAuth, requireRole('ADMIN', 'MANAGER', 'EMPLOYEE'));

const LATE_GRACE_MINUTES = 15;

/** Staff whose attendance this user may view: everyone for admins, direct reports for managers. */
function teamWhere(user: AuthUser) {
  return {
    companyId: user.companyId,
    role: { not: 'CLIENT' as const },
    isActive: true,
    ...(user.role === 'MANAGER' ? { OR: [{ managerId: user.id }, { id: user.id }] } : {}),
  };
}

attendanceRouter.post('/check-in', async (req, res) => {
  const user = currentUser(req);
  const body = z.object({ lat: z.number().min(-90).max(90).optional(), lng: z.number().min(-180).max(180).optional() }).parse(req.body ?? {});
  const company = await prisma.company.findUniqueOrThrow({ where: { id: user.companyId } });
  const now = new Date();
  const date = localDate(now, company.timezone);

  let distanceM: number | null = null;
  if (company.officeLat != null && company.officeLng != null) {
    if (body.lat == null || body.lng == null) throw badRequest('Location is required to check in. Please allow location access.');
    distanceM = Math.round(distanceMetres(body.lat, body.lng, company.officeLat, company.officeLng));
    if (distanceM > company.officeRadiusM) {
      throw badRequest(`You are ${distanceM} m from the office. Check-in is allowed within ${company.officeRadiusM} m.`);
    }
  }

  const onLeave = await prisma.leave.findFirst({
    where: { userId: user.id, status: 'APPROVED', startDate: { lte: date }, endDate: { gte: date } },
  });
  if (onLeave) throw badRequest('You are on approved leave today');

  const late = localMinutes(now, company.timezone) > parseHHmm(company.workStartTime) + LATE_GRACE_MINUTES;
  const existing = await prisma.attendance.findUnique({ where: { userId_date: { userId: user.id, date } } });
  if (existing) throw conflict('You have already checked in today');

  const record = await prisma.attendance.create({
    data: {
      companyId: user.companyId,
      userId: user.id,
      date,
      checkIn: now,
      checkInLat: body.lat,
      checkInLng: body.lng,
      distanceM,
      status: late ? 'LATE' : 'PRESENT',
    },
  });
  emit(rooms.company(user.companyId), 'attendance:changed', { userId: user.id });
  res.status(201).json({ attendance: record });
});

attendanceRouter.post('/check-out', async (req, res) => {
  const user = currentUser(req);
  const company = await prisma.company.findUniqueOrThrow({ where: { id: user.companyId } });
  const date = localDate(new Date(), company.timezone);
  const record = await prisma.attendance.findUnique({ where: { userId_date: { userId: user.id, date } } });
  if (!record) throw badRequest('You have not checked in today');
  if (record.checkOut) throw conflict('You have already checked out today');

  const updated = await prisma.attendance.update({ where: { id: record.id }, data: { checkOut: new Date() } });
  emit(rooms.company(user.companyId), 'attendance:changed', { userId: user.id });
  res.json({ attendance: updated });
});

attendanceRouter.get('/me', async (req, res) => {
  const user = currentUser(req);
  const company = await prisma.company.findUniqueOrThrow({ where: { id: user.companyId } });
  const today = localDate(new Date(), company.timezone);
  const month = z.string().regex(/^\d{4}-\d{2}$/).catch(today.slice(0, 7)).parse(req.query.month);

  const records = await prisma.attendance.findMany({
    where: { userId: user.id, date: { startsWith: month } },
    orderBy: { date: 'desc' },
  });
  res.json({
    today: records.find((r) => r.date === today) ?? (await prisma.attendance.findUnique({ where: { userId_date: { userId: user.id, date: today } } })),
    records,
    geofence: company.officeLat != null ? { radiusM: company.officeRadiusM } : null,
  });
});

// Live "who's in today" board for admins and managers.
attendanceRouter.get('/today', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const user = currentUser(req);
  const company = await prisma.company.findUniqueOrThrow({ where: { id: user.companyId } });
  const date = localDate(new Date(), company.timezone);

  const [staff, records, leaves] = await Promise.all([
    prisma.user.findMany({ where: teamWhere(user), select: { id: true, name: true, designation: true, department: true }, orderBy: { name: 'asc' } }),
    prisma.attendance.findMany({ where: { companyId: user.companyId, date } }),
    prisma.leave.findMany({ where: { companyId: user.companyId, status: 'APPROVED', startDate: { lte: date }, endDate: { gte: date } } }),
  ]);
  const byUser = new Map(records.map((r) => [r.userId, r]));
  const leaveByUser = new Map(leaves.map((l) => [l.userId, l]));

  const rows = staff.map((s) => {
    const record = byUser.get(s.id);
    const leave = leaveByUser.get(s.id);
    return {
      user: s,
      status: record ? record.status : leave ? 'ON_LEAVE' : 'ABSENT',
      checkIn: record?.checkIn ?? null,
      checkOut: record?.checkOut ?? null,
      leaveType: leave?.type ?? null,
    };
  });
  res.json({ date, rows });
});

// Monthly per-employee summary (input for payroll).
attendanceRouter.get('/report', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const user = currentUser(req);
  const company = await prisma.company.findUniqueOrThrow({ where: { id: user.companyId } });
  const month = z.string().regex(/^\d{4}-\d{2}$/).catch(localDate(new Date(), company.timezone).slice(0, 7)).parse(req.query.month);

  const staff = await prisma.user.findMany({ where: teamWhere(user), select: { id: true, name: true, designation: true }, orderBy: { name: 'asc' } });
  const records = await prisma.attendance.groupBy({
    by: ['userId', 'status'],
    where: { companyId: user.companyId, date: { startsWith: month } },
    _count: { _all: true },
  });
  const rows = staff.map((s) => {
    const mine = records.filter((r) => r.userId === s.id);
    const present = mine.find((r) => r.status === 'PRESENT')?._count._all ?? 0;
    const late = mine.find((r) => r.status === 'LATE')?._count._all ?? 0;
    return { user: s, present: present + late, late };
  });
  res.json({ month, rows });
});
