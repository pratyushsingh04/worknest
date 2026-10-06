// End-to-end check of meetings and the summariser against a running local API.
//   npx tsx scripts/e2e-meetings.mts
// Creates a throwaway company with two people, walks the flow, then deletes it.
// With no AI key set the summary is the basic one, which is what this asserts on.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const API = process.env.API_URL ?? 'http://localhost:4000/api';
const prisma = new PrismaClient();
const stamp = Date.now().toString(36);
const emails = { a: `e2e-ma-${stamp}@example.com`, b: `e2e-mb-${stamp}@example.com`, c: `e2e-mc-${stamp}@example.com` };
const password = `Test-${stamp}-9x`;

let step = 0;
function ok(label: string, cond: unknown, extra?: unknown) {
  step++;
  if (!cond) {
    console.error(`FAIL ${step}. ${label}`, extra ?? '');
    throw new Error(label);
  }
  console.log(`ok ${step}. ${label}`);
}

function session() {
  let cookie = '';
  return async function call(method: string, path: string, body?: unknown) {
    const res = await fetch(API + path, { method, headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
    for (const c of res.headers.getSetCookie?.() ?? []) if (c.startsWith('wn_token=')) cookie = c.split(';')[0];
    return { status: res.status, data: (await res.json().catch(() => ({}))) as any };
  };
}

async function main() {
  const a = session();
  const b = session();
  const c = session();

  let r = await a('POST', '/auth/register-company', { companyName: `E2E Meet ${stamp}`, name: 'Asha Admin', email: emails.a, password });
  ok('company registers', r.status === 201, r.data);
  const adminId = r.data.user.id;
  r = await a('POST', '/users', { name: 'Ravi Kumar', email: emails.b, role: 'EMPLOYEE', password, designation: 'Developer' });
  ok('admin adds a colleague', r.status === 201, r.data);
  const raviId = r.data.user.id;
  r = await b('POST', '/auth/login', { email: emails.b, password });
  ok('colleague signs in', r.status === 200);
  r = await c('POST', '/auth/register-company', { companyName: `E2E Other ${stamp}`, name: 'Other Admin', email: emails.c, password });
  const outsiderId = r.data.user.id;

  const startsAt = new Date(Date.now() + 3600_000).toISOString();
  r = await b('POST', '/meetings', { title: 'Sprint planning', agenda: 'Plan the checkout work', startsAt, durationMin: 45, attendeeIds: [adminId] });
  ok('an employee schedules a meeting with a colleague', r.status === 201 && r.data.meeting.joinUrl === null && r.data.meeting.attendees.length === 2, r.data);
  const id = r.data.meeting.id;

  r = await b('POST', '/meetings', { title: 'Bad invite', startsAt, attendeeIds: [outsiderId] });
  ok('someone from another company cannot be invited', r.status === 400, r.status);

  r = await a('GET', '/meetings');
  ok('the invited admin sees it under upcoming', r.data.upcoming.some((m: any) => m.id === id) && r.data.upcoming[0].notes === undefined, r.data);
  r = await c('GET', `/meetings/${id}`);
  ok('another company cannot open it', r.status === 404);

  r = await a('POST', `/meetings/${id}/summarise`, {});
  ok('summarising without notes is refused with a clear message', r.status === 400, r.data);

  const notes = [
    'We reviewed the checkout flow and the payment gateway options.',
    'Decided to go with Razorpay for payments.',
    'Ravi will finish the checkout page by Friday.',
    'Asha needs to confirm the launch date with the client.',
    'The delivery slot picker is still blocked on the API.',
  ].join('\n');
  r = await a('PUT', `/meetings/${id}/notes`, { notes });
  ok('an attendee saves the notes', r.status === 200 && r.data.meeting.notes.includes('Razorpay'));

  r = await b('POST', `/meetings/${id}/summarise`, {});
  const m = r.data.meeting;
  ok('summary is produced', r.status === 200 && !!m.summary && !!m.summaryMode, r.data);
  if (m.summaryMode === 'basic') {
    ok('basic summary finds the decision', m.decisions.length === 1 && m.decisions[0].includes('Razorpay'), m.decisions);
    ok('basic summary finds the action items with owners and a due date', m.actionItems.length === 2 && m.actionItems[0].owner === 'Ravi Kumar' && m.actionItems[0].due === 'Friday' && m.actionItems[1].owner === 'Asha Admin', m.actionItems);
  } else {
    ok('AI summary has decisions and action items', m.decisions.length >= 1 && m.actionItems.length >= 1, m);
  }

  r = await b('PATCH', `/meetings/${id}`, { title: 'Sprint planning (week 2)', attendeeIds: [] });
  ok('organiser renames it and the organiser always stays invited', r.status === 200 && r.data.meeting.title.includes('week 2') && r.data.meeting.attendees.length === 1, r.data);
  r = await a('GET', `/meetings/${id}`);
  ok('an admin still sees every company meeting', r.status === 200 && r.data.permissions.canEdit === true);

  const tok = (await b('GET', '/auth/socket-token')).data.token;
  const chat = await fetch(API + '/assistant/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` }, body: JSON.stringify({ messages: [{ role: 'user', content: 'what was decided in sprint planning (week 2) meeting' }] }) });
  const reply = ((await chat.json()) as any).reply as string;
  ok('the assistant can answer from the meeting summary', chat.status === 200 && /razorpay/i.test(reply), reply);

  r = await a('DELETE', `/meetings/${id}`);
  ok('an admin can cancel it', r.status === 200);
  void raviId;
}

main()
  .then(() => console.log(`\nAll ${step} checks passed.`))
  .catch((e) => {
    console.error('\nStopped:', e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    const users = await prisma.user.findMany({ where: { email: { in: Object.values(emails) } }, select: { companyId: true } });
    await prisma.company.deleteMany({ where: { id: { in: users.map((u) => u.companyId).filter((x): x is string => !!x) } } });
    console.log('Cleaned up test data.');
    await prisma.$disconnect();
  });
