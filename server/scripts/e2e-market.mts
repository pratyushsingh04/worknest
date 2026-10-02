// End-to-end check of the client marketplace against a running local API.
//   npx tsx scripts/e2e-market.mts          run, then delete everything it created
//   npx tsx scripts/e2e-market.mts --keep   leave the data in place to look at in the browser;
//                                           sign-in details go to .e2e-accounts.json (gitignored)
// Creates two throwaway companies and one client and walks the whole flow.
import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

const API = process.env.API_URL ?? 'http://localhost:4000/api';
const prisma = new PrismaClient();
const stamp = Date.now().toString(36);
const emails = { a: `e2e-a-${stamp}@example.com`, b: `e2e-b-${stamp}@example.com`, c: `e2e-c-${stamp}@example.com` };
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
    const res = await fetch(API + path, {
      method,
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.getSetCookie?.() ?? [];
    for (const c of set) if (c.startsWith('wn_token=')) cookie = c.split(';')[0];
    const data = (await res.json().catch(() => ({}))) as any;
    return { status: res.status, data };
  };
}

const profile = {
  tagline: 'Product engineering for growing retailers',
  about: 'We design, build and run web and mobile products for retail brands, from first prototype to a platform that handles real traffic.',
  industry: 'Software & IT services',
  specialities: ['E-commerce', 'Mobile apps'],
  offerings: ['Build a web app', 'Redesign a storefront'],
  city: 'Bengaluru',
  country: 'India',
  website: null,
  foundedYear: 2019,
  sizeRange: '11-50',
  contactEmail: null,
};

async function main() {
  const a = session();
  const b = session();
  const c = session();

  let r = await a('POST', '/auth/register-company', { companyName: `E2E Studio ${stamp}`, name: 'Asha Admin', email: emails.a, password, profile });
  ok('company with a full profile registers', r.status === 201, r.data);
  ok('and is listed straight away', r.data.user.company.isListed === true);
  const slug = r.data.user.company.slug;
  const adminId = r.data.user.id;

  r = await b('POST', '/auth/register-company', { companyName: `E2E Halfway ${stamp}`, name: 'Bala Admin', email: emails.b, password, profile: { tagline: 'Too short', specialities: [], offerings: [] } });
  ok('company with an incomplete profile registers but is not listed', r.status === 201 && r.data.user.company.isListed === false, r.data);

  r = await a('POST', '/teams', { name: 'Web', tagline: 'Storefronts that sell', color: 'emerald', leadId: adminId, skills: ['Next.js'], visibleToClients: true });
  ok('admin creates a client-facing team', r.status === 201, r.data);
  const teamId = r.data.team.id;
  r = await a('POST', `/teams/${teamId}/services`, { title: 'Storefront build', description: 'A complete online store, designed and built.', deliverables: ['Design', 'Build'], turnaround: '6 weeks', startingPrice: 300000 });
  ok('and a service', r.status === 201, r.data);
  const serviceId = r.data.service.id;

  r = await c('POST', '/auth/register-client', { name: 'Chitra Client', email: emails.c, password, organisation: 'FreshCart', phone: '+91 90000 00000' });
  ok('client signs up on their own, with no company', r.status === 201 && r.data.user.role === 'CLIENT' && r.data.user.company === null, r.data);

  r = await c('GET', '/market/companies');
  ok('directory shows the complete company', r.status === 200 && r.data.companies.some((x: any) => x.slug === slug));
  ok('and hides the incomplete one', !r.data.companies.some((x: any) => x.name.includes('Halfway')));
  r = await c('GET', '/market/companies?q=e-commerce');
  ok('search by speciality finds it', r.data.companies.some((x: any) => x.slug === slug), r.data);

  r = await c('GET', `/market/companies/${slug}`);
  ok('company page has profile, teams, services, people and record', r.status === 200 && r.data.teams[0]?.services.length === 1 && r.data.people.length === 1 && r.data.trackRecord.delivered === 0, r.data);

  for (const path of ['/users', '/dashboard', '/teams', '/clients', '/company', '/attendance/today']) {
    r = await c('GET', path);
    ok(`client is refused on workspace route ${path}`, r.status === 403, r.status);
  }
  r = await a('GET', '/market/home');
  ok('staff are refused on the client portal API', r.status === 403);

  r = await c('POST', '/requests', { teamId, serviceId, title: 'Online store for FreshCart', details: 'We need a storefront with delivery slots and UPI payments.', budget: '3-4 lakh' });
  ok('client requests a service from the team', r.status === 201 && r.data.request.company.slug === slug, r.data);
  const requestId = r.data.request.id;

  r = await a('GET', '/requests');
  const inbox = r.data.requests.find((x: any) => x.id === requestId);
  ok('company sees the request with the client contact', inbox?.client.account?.email === emails.c && inbox.client.name === 'FreshCart', inbox);
  r = await a('GET', '/clients');
  ok('client now appears in the company contact book', r.data.clients.some((x: any) => x.account?.email === emails.c));

  r = await a('PATCH', `/requests/${requestId}`, { status: 'ACCEPTED', response: 'Happy to take this on.' });
  ok('company accepts', r.status === 200);
  r = await a('POST', `/requests/${requestId}/convert`, {});
  ok('and starts a project', r.status === 201, r.data);
  const projectId = r.data.project.id;

  r = await a('POST', `/projects/${projectId}/milestones`, { title: 'Design sign-off' });
  const milestoneId = r.data.milestone.id;
  r = await a('POST', '/tasks', { projectId, title: 'Home page design', milestoneId, status: 'DONE' });
  ok('team adds a milestone and a finished task', r.status === 201, r.data);
  r = await a('PATCH', `/projects/${projectId}/milestones/${milestoneId}`, { status: 'AWAITING_APPROVAL' });
  ok('and submits the milestone for approval', r.status === 200);

  r = await c('GET', '/market/home');
  const mine = r.data.projects?.find((x: any) => x.id === projectId);
  ok('client home shows the project with company, team, progress and the sign-off', !!mine && mine.company.slug === slug && mine.team.name === 'Web' && mine.progress.percent === 100 && r.data.awaitingApproval.length === 1, r.data);

  r = await c('GET', `/projects/${projectId}`);
  ok('client opens the project, without internal task fields', r.status === 200 && r.data.project.tasks[0].priority === undefined && r.data.project.company.slug === slug, r.data);
  r = await c('POST', `/projects/${projectId}/milestones/${milestoneId}/review`, { decision: 'APPROVED' });
  ok('client approves the milestone', r.status === 200 && r.data.milestone.status === 'APPROVED', r.data);
  r = await c('POST', `/projects/${projectId}/comments`, { body: 'Looks great.' });
  ok('client comments in the shared thread', r.status === 201);
  r = await a('GET', `/projects/${projectId}/activity`);
  ok('company sees the approval in its activity', r.data.activities.some((x: any) => x.message.includes('approved milestone')), r.data);
  r = await b('GET', `/projects/${projectId}`);
  ok('another company cannot open the project', r.status === 404);

  r = await c('POST', '/needs', { title: 'Loyalty app for our stores', details: 'A mobile app where shoppers collect points and redeem them in store.', category: 'Mobile app', budget: '5 lakh' });
  ok('client posts a need', r.status === 201, r.data);
  const needId = r.data.need.id;

  r = await a('GET', '/needs');
  const lead = r.data.needs.find((x: any) => x.id === needId);
  ok('listed company sees the need with the client contact', lead?.client.email === emails.c && lead.client.organisation === 'FreshCart' && r.data.teams.length === 1, r.data);
  r = await b('POST', `/needs/${needId}/proposals`, { teamId, message: 'We would love to build this for you, here is how.' });
  ok('unlisted company cannot send a proposal', r.status === 403 || r.status === 400, r.status);
  r = await a('POST', `/needs/${needId}/proposals`, { teamId, message: 'We have built two loyalty apps. Eight weeks, fixed price.' });
  ok('listed company sends a proposal', r.status === 201, r.data);
  r = await a('POST', `/needs/${needId}/proposals`, { teamId, message: 'A second proposal should not be allowed.' });
  ok('only one proposal per company', r.status === 409, r.status);

  r = await c('GET', '/needs');
  const proposal = r.data.needs.find((x: any) => x.id === needId)?.proposals[0];
  ok('client sees the proposal with company and team', proposal?.company.slug === slug && proposal.team.name === 'Web', r.data);
  r = await c('POST', `/needs/proposals/${proposal.id}/respond`, { decision: 'ACCEPT' });
  ok('client accepts it, opening an accepted request', r.status === 201 && r.data.request.status === 'ACCEPTED', r.data);
  r = await c('GET', '/needs');
  ok('the need is closed', r.data.needs.find((x: any) => x.id === needId)?.status === 'CLOSED');
  r = await a('GET', '/requests');
  ok('company finds the accepted request ready to start', r.data.requests.some((x: any) => x.id !== requestId && x.status === 'ACCEPTED'));

  r = await b('PATCH', '/company', { ...profile, tagline: 'Careful accounting for small firms' });
  ok('finishing the profile lists the second company', r.status === 200 && r.data.company.isListed === true, r.data);
  r = await b('PATCH', '/company', { specialities: [] });
  ok('and removing a required field hides it again', r.status === 200 && r.data.company.isListed === false, r.data);

  r = await c('PATCH', '/auth/me', { bio: 'Grocery delivery in three cities.' });
  ok('client updates their own profile', r.status === 200 && r.data.user.bio.startsWith('Grocery'));
}

main()
  .then(() => console.log(`\nAll ${step} checks passed.`))
  .catch((e) => {
    console.error('\nStopped:', e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (process.argv.includes('--keep')) {
      writeFileSync('.e2e-accounts.json', JSON.stringify({ company: emails.a, client: emails.c, password }, null, 2));
      console.log('Kept the test data. Sign-in details are in server/.e2e-accounts.json.');
      return prisma.$disconnect();
    }
    // Remove everything this run created.
    const users = await prisma.user.findMany({ where: { email: { in: Object.values(emails) } }, select: { id: true, companyId: true } });
    const companyIds = users.map((u) => u.companyId).filter((x): x is string => !!x);
    await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
    await prisma.user.deleteMany({ where: { email: { in: Object.values(emails) } } });
    console.log('Cleaned up test data.');
    await prisma.$disconnect();
  });
