import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import type { AuthUser } from '../lib/auth';
import { badRequest, forbidden, notFound, tooManyRequests } from '../lib/errors';
import { logActivity } from '../lib/activity';
import { hit } from '../lib/rate-limit';
import { emit, rooms } from '../lib/socket';
import { summariseMeeting } from '../lib/summarise';
import { currentUser, param, requireAuth, requireStaff } from '../middleware/auth';

// Meetings between people inside one company: schedule, join, take notes, summarise.
export const meetingsRouter = Router();
meetingsRouter.use(requireAuth, requireStaff);

const person = { select: { id: true, name: true, designation: true } } as const;
const meetingInclude = { organiser: person, attendees: { include: { user: person } } } as const;

/** Admins see every meeting in the company; everyone else sees the ones they organise or attend. */
function scope(user: AuthUser): Prisma.MeetingWhereInput {
  const base = { companyId: user.companyId };
  return user.role === 'ADMIN' ? base : { ...base, OR: [{ organiserId: user.id }, { attendees: { some: { userId: user.id } } }] };
}

async function load(user: AuthUser, id: string) {
  const meeting = await prisma.meeting.findFirst({ where: { AND: [{ id }, scope(user)] }, include: meetingInclude });
  if (!meeting) throw notFound('Meeting not found');
  return meeting;
}

const canEdit = (user: AuthUser, meeting: { organiserId: string | null }) => user.role === 'ADMIN' || meeting.organiserId === user.id;

async function assertColleagues(companyId: string, ids: string[]) {
  if (!ids.length) return;
  const count = await prisma.user.count({ where: { id: { in: ids }, companyId, isActive: true, role: { not: 'CLIENT' } } });
  if (count !== new Set(ids).size) throw badRequest('Everyone invited must be an active member of your company');
}

/** A free video room nobody else can guess. Used when the organiser gives no link of their own. */
const videoRoom = () => `https://meet.jit.si/WorkNest-${randomBytes(9).toString('base64url')}`;

const body = z.object({
  title: z.string().trim().min(2).max(120),
  agenda: z.string().trim().max(2000).nullable().optional(),
  startsAt: z.coerce.date(),
  durationMin: z.number().int().min(5).max(600).default(30),
  joinUrl: z
    .string()
    .trim()
    .max(300)
    .regex(/^https:\/\/\S+$/i, 'must be an https link')
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  attendeeIds: z.array(z.string()).max(100).default([]),
});

meetingsRouter.get('/', async (req, res) => {
  const user = currentUser(req);
  const now = new Date();
  // A meeting stays "upcoming" until it would have ended, so a running one is still joinable.
  const meetings = await prisma.meeting.findMany({ where: scope(user), include: meetingInclude, orderBy: { startsAt: 'desc' }, take: 200 });
  const ended = (m: { startsAt: Date; durationMin: number }) => m.startsAt.getTime() + m.durationMin * 60_000 < now.getTime();
  const strip = ({ notes, ...m }: (typeof meetings)[number]) => ({ ...m, hasNotes: !!notes?.trim() });
  res.json({
    upcoming: meetings.filter((m) => !ended(m)).reverse().map(strip),
    past: meetings.filter(ended).slice(0, 60).map(strip),
  });
});

meetingsRouter.post('/', async (req, res) => {
  const user = currentUser(req);
  const retry = hit(`meeting:${user.id}`, 30, 60 * 60 * 1000);
  if (retry) throw tooManyRequests(retry);
  const { attendeeIds, ...data } = body.parse(req.body);
  const invited = [...new Set([...attendeeIds, user.id])];
  await assertColleagues(user.companyId, invited);

  const meeting = await prisma.meeting.create({
    data: {
      ...data,
      agenda: data.agenda || null,
      joinUrl: data.joinUrl || videoRoom(),
      companyId: user.companyId,
      organiserId: user.id,
      attendees: { create: invited.map((userId) => ({ userId })) },
    },
    include: meetingInclude,
  });
  await logActivity({ companyId: user.companyId, actorId: user.id, message: `scheduled the meeting "${meeting.title}"` });
  for (const id of invited) {
    if (id !== user.id) emit(rooms.user(id), 'notification', { message: `${meeting.organiser?.name ?? 'Someone'} invited you to "${meeting.title}"` });
    emit(rooms.user(id), 'meeting:changed', { id: meeting.id });
  }
  res.status(201).json({ meeting });
});

meetingsRouter.get('/:id', async (req, res) => {
  const user = currentUser(req);
  const meeting = await load(user, param(req, 'id'));
  res.json({ meeting, permissions: { canEdit: canEdit(user, meeting) } });
});

meetingsRouter.patch('/:id', async (req, res) => {
  const user = currentUser(req);
  const existing = await load(user, param(req, 'id'));
  if (!canEdit(user, existing)) throw forbidden('Only the organiser can change this meeting');
  const { attendeeIds, ...data } = body.partial().parse(req.body);

  if (attendeeIds) {
    const keep = [...new Set([...attendeeIds, ...(existing.organiserId ? [existing.organiserId] : [])])];
    await assertColleagues(user.companyId, keep);
    await prisma.$transaction([
      prisma.meetingAttendee.deleteMany({ where: { meetingId: existing.id, userId: { notIn: keep } } }),
      prisma.meetingAttendee.createMany({ data: keep.map((userId) => ({ meetingId: existing.id, userId })), skipDuplicates: true }),
    ]);
    const added = keep.filter((id) => !existing.attendees.some((a) => a.userId === id));
    for (const id of added) emit(rooms.user(id), 'notification', { message: `You were added to "${existing.title}"` });
  }
  const meeting = await prisma.meeting.update({ where: { id: existing.id }, data: { ...data, ...(data.joinUrl === null ? { joinUrl: videoRoom() } : {}) }, include: meetingInclude });
  for (const a of meeting.attendees) emit(rooms.user(a.userId), 'meeting:changed', { id: meeting.id });
  res.json({ meeting });
});

// Anyone in the meeting can write the notes; they are the raw material for the summary.
meetingsRouter.put('/:id/notes', async (req, res) => {
  const user = currentUser(req);
  const existing = await load(user, param(req, 'id'));
  const { notes } = z.object({ notes: z.string().max(40_000) }).parse(req.body);
  const meeting = await prisma.meeting.update({ where: { id: existing.id }, data: { notes: notes.trim() || null }, include: meetingInclude });
  for (const a of meeting.attendees) if (a.userId !== user.id) emit(rooms.user(a.userId), 'meeting:changed', { id: meeting.id });
  res.json({ meeting });
});

meetingsRouter.post('/:id/summarise', async (req, res) => {
  const user = currentUser(req);
  const existing = await load(user, param(req, 'id'));
  const retry = hit(`summarise:${user.id}`, 20, 60 * 60 * 1000);
  if (retry) throw tooManyRequests(retry);
  if (!existing.notes || existing.notes.trim().length < 40) throw badRequest('Add some notes first: a few sentences on what was discussed is enough.');

  const result = await summariseMeeting({
    title: existing.title,
    agenda: existing.agenda,
    notes: existing.notes,
    attendees: existing.attendees.map((a) => a.user.name),
    date: existing.startsAt.toISOString().slice(0, 10),
  });
  const meeting = await prisma.meeting.update({
    where: { id: existing.id },
    data: { summary: result.summary, decisions: result.decisions, actionItems: result.actionItems as unknown as Prisma.InputJsonValue, summaryMode: result.mode, summarisedAt: new Date() },
    include: meetingInclude,
  });
  await logActivity({ companyId: user.companyId, actorId: user.id, message: `summarised the meeting "${meeting.title}"` });
  for (const a of meeting.attendees) {
    if (a.userId !== user.id) emit(rooms.user(a.userId), 'notification', { message: `The summary of "${meeting.title}" is ready` });
    emit(rooms.user(a.userId), 'meeting:changed', { id: meeting.id });
  }
  res.json({ meeting });
});

meetingsRouter.delete('/:id', async (req, res) => {
  const user = currentUser(req);
  const existing = await load(user, param(req, 'id'));
  if (!canEdit(user, existing)) throw forbidden('Only the organiser can cancel this meeting');
  await prisma.meeting.delete({ where: { id: existing.id } });
  for (const a of existing.attendees) {
    if (a.userId !== user.id) emit(rooms.user(a.userId), 'notification', { message: `"${existing.title}" was cancelled` });
    emit(rooms.user(a.userId), 'meeting:changed', { id: existing.id });
  }
  res.json({ ok: true });
});
