// Fills the database with a realistic demo company so every screen has data.
// Optional demo company for screenshots/testing. Run with: npm run db:demo   (wipes existing data first)
import { PrismaClient, type TaskStatus, type Priority } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { issuePasswordReset } from '../src/lib/tokens';
import { workingDays } from '../src/lib/dates';

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'Password@123';

function ymd(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
}

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function main() {
  await prisma.company.deleteMany();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const company = await prisma.company.create({
    data: { name: 'Nimbus Labs', slug: 'nimbus-labs', workStartTime: '10:00' },
  });
  const staff = async (name: string, email: string, role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE', designation: string, department: string, managerId?: string) =>
    prisma.user.create({ data: { companyId: company.id, name, email, role, designation, department, managerId, passwordHash } });

  // The real owner (from server/.env). Their password is random until they set it via the printed link.
  const ownerEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const founder = ownerEmail
    ? await prisma.user.create({
        data: {
          companyId: company.id,
          name: process.env.ADMIN_NAME?.trim() || ownerEmail.split('@')[0],
          email: ownerEmail,
          role: 'ADMIN',
          designation: 'Founder & CEO',
          department: 'Leadership',
          isPlatformAdmin: true,
          passwordHash: await bcrypt.hash(randomBytes(32).toString('hex'), 10),
        },
      })
    : null;

  const admin = await staff('Aarav Mehta', 'admin@worknest.dev', 'ADMIN', founder ? 'COO' : 'CEO', 'Leadership', founder?.id);
  const priya = await staff('Priya Sharma', 'manager@worknest.dev', 'MANAGER', 'Engineering Manager', 'Engineering', admin.id);
  const kabir = await staff('Kabir Singh', 'kabir@worknest.dev', 'MANAGER', 'Design Lead', 'Design', admin.id);
  const rahul = await staff('Rahul Verma', 'employee@worknest.dev', 'EMPLOYEE', 'Full Stack Developer', 'Engineering', priya.id);
  const sneha = await staff('Sneha Iyer', 'sneha@worknest.dev', 'EMPLOYEE', 'Frontend Developer', 'Engineering', priya.id);
  const arjun = await staff('Arjun Nair', 'arjun@worknest.dev', 'EMPLOYEE', 'Backend Developer', 'Engineering', priya.id);
  const meera = await staff('Meera Joshi', 'meera@worknest.dev', 'EMPLOYEE', 'UI/UX Designer', 'Design', kabir.id);

  // Clients have their own accounts and belong to no company.
  const vikram = await prisma.user.create({ data: { name: 'Vikram Rao', email: 'client@worknest.dev', role: 'CLIENT', organisation: 'FreshCart', passwordHash } });
  const anjali = await prisma.user.create({ data: { name: 'Dr. Anjali Gupta', email: 'carewell@worknest.dev', role: 'CLIENT', organisation: 'CareWell Clinics', passwordHash } });
  const freshcart = await prisma.client.create({ data: { companyId: company.id, accountId: vikram.id, name: 'FreshCart', contactEmail: 'ops@freshcart.in', industry: 'Grocery delivery' } });
  const medplus = await prisma.client.create({ data: { companyId: company.id, accountId: anjali.id, name: 'CareWell Clinics', contactEmail: 'it@carewell.in', industry: 'Healthcare' } });

  type SeedTask = [title: string, status: TaskStatus, priority: Priority, assigneeId: string, milestone: number];
  async function project(opts: {
    name: string;
    description: string;
    clientId: string;
    managerId: string;
    members: string[];
    status: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED';
    start: number;
    due: number;
    milestones: [string, 'PENDING' | 'IN_PROGRESS' | 'AWAITING_APPROVAL' | 'APPROVED'][];
    tasks: SeedTask[];
  }) {
    const p = await prisma.project.create({
      data: {
        companyId: company.id,
        name: opts.name,
        description: opts.description,
        clientId: opts.clientId,
        managerId: opts.managerId,
        status: opts.status,
        startDate: daysFromNow(opts.start),
        dueDate: daysFromNow(opts.due),
        members: { create: [...new Set([opts.managerId, ...opts.members])].map((userId) => ({ userId })) },
      },
    });
    const milestones = [];
    for (const [i, [title, status]] of opts.milestones.entries()) {
      milestones.push(await prisma.milestone.create({ data: { projectId: p.id, title, status, position: i, dueDate: daysFromNow(opts.start + (i + 1) * 14) } }));
    }
    for (const [i, [title, status, priority, assigneeId, m]] of opts.tasks.entries()) {
      await prisma.task.create({
        data: {
          projectId: p.id,
          title,
          status,
          priority,
          assigneeId,
          milestoneId: milestones[m]?.id,
          position: i,
          estimateHours: [4, 6, 8, 12][i % 4],
          dueDate: daysFromNow(3 + i),
          completedAt: status === 'DONE' ? daysFromNow(-(opts.tasks.length - i)) : null,
        },
      });
      if (status === 'DONE') {
        await prisma.activity.create({
          data: { companyId: company.id, projectId: p.id, actorId: assigneeId, message: `completed "${title}"`, clientVisible: true, createdAt: daysFromNow(-(opts.tasks.length - i)) },
        });
      }
    }
    return p;
  }

  await project({
    name: 'FreshCart Mobile App',
    description: 'Customer app for 30-minute grocery delivery: catalogue, cart, payments and live order tracking.',
    clientId: freshcart.id,
    managerId: priya.id,
    members: [rahul.id, sneha.id, arjun.id, meera.id],
    status: 'ACTIVE',
    start: -30,
    due: 45,
    milestones: [
      ['Design & prototype', 'APPROVED'],
      ['Catalogue & cart', 'AWAITING_APPROVAL'],
      ['Payments & checkout', 'IN_PROGRESS'],
      ['Live order tracking', 'PENDING'],
    ],
    tasks: [
      ['Wireframes for all screens', 'DONE', 'HIGH', meera.id, 0],
      ['Design system & components', 'DONE', 'MEDIUM', meera.id, 0],
      ['Auth with OTP login', 'DONE', 'HIGH', rahul.id, 1],
      ['Product listing API', 'DONE', 'HIGH', arjun.id, 1],
      ['Product listing screen', 'DONE', 'MEDIUM', sneha.id, 1],
      ['Cart service', 'DONE', 'HIGH', arjun.id, 1],
      ['Razorpay integration', 'IN_PROGRESS', 'URGENT', rahul.id, 2],
      ['Checkout screen', 'IN_REVIEW', 'HIGH', sneha.id, 2],
      ['Order history API', 'TODO', 'MEDIUM', arjun.id, 2],
      ['Rider location websocket', 'TODO', 'HIGH', rahul.id, 3],
      ['Tracking map screen', 'TODO', 'MEDIUM', sneha.id, 3],
      ['Push notifications', 'TODO', 'LOW', arjun.id, 3],
    ],
  });

  await project({
    name: 'CareWell Patient Portal',
    description: 'Online appointment booking, prescriptions and reports for a chain of clinics.',
    clientId: medplus.id,
    managerId: priya.id,
    members: [arjun.id, sneha.id],
    status: 'ACTIVE',
    start: -10,
    due: 60,
    milestones: [
      ['Appointment booking', 'IN_PROGRESS'],
      ['Reports & prescriptions', 'PENDING'],
    ],
    tasks: [
      ['Doctor availability model', 'DONE', 'HIGH', arjun.id, 0],
      ['Booking API with slot locking', 'IN_PROGRESS', 'URGENT', arjun.id, 0],
      ['Booking calendar UI', 'IN_PROGRESS', 'HIGH', sneha.id, 0],
      ['Upload lab reports', 'TODO', 'MEDIUM', arjun.id, 1],
      ['Prescription PDF viewer', 'TODO', 'LOW', sneha.id, 1],
    ],
  });

  await project({
    name: 'FreshCart Brand Refresh',
    description: 'New logo, colours and marketing site.',
    clientId: freshcart.id,
    managerId: kabir.id,
    members: [meera.id],
    status: 'COMPLETED',
    start: -60,
    due: -5,
    milestones: [['Brand identity', 'APPROVED']],
    tasks: [
      ['Moodboard', 'DONE', 'MEDIUM', meera.id, 0],
      ['Logo concepts', 'DONE', 'HIGH', meera.id, 0],
      ['Marketing site', 'DONE', 'HIGH', meera.id, 0],
    ],
  });

  // Attendance for the last 10 working days.
  const team = [priya, kabir, rahul, sneha, arjun, meera];
  for (let offset = -10; offset <= -1; offset++) {
    const date = ymd(offset);
    const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
    if (dow === 0 || dow === 6) continue;
    for (const [i, u] of team.entries()) {
      if ((i + offset) % 7 === 0) continue; // occasional absence
      const late = (i + offset) % 4 === 0;
      const checkIn = new Date(`${date}T${late ? '10:32' : '09:48'}:00+05:30`);
      const checkOut = new Date(`${date}T18:45:00+05:30`);
      await prisma.attendance.create({ data: { companyId: company.id, userId: u.id, date, checkIn, checkOut, status: late ? 'LATE' : 'PRESENT' } });
    }
  }

  await prisma.leave.createMany({
    data: [
      { companyId: company.id, userId: sneha.id, type: 'CASUAL', startDate: ymd(7), endDate: ymd(8), days: workingDays(ymd(7), ymd(8)), reason: "Cousin's wedding", status: 'PENDING' },
      { companyId: company.id, userId: arjun.id, type: 'SICK', startDate: ymd(-20), endDate: ymd(-19), days: workingDays(ymd(-20), ymd(-19)), reason: 'Fever', status: 'APPROVED', reviewerId: priya.id },
      { companyId: company.id, userId: rahul.id, type: 'EARNED', startDate: ymd(20), endDate: ymd(24), days: workingDays(ymd(20), ymd(24)), reason: 'Family trip to Manali', status: 'PENDING' },
    ],
  });

  // A few people are already in today, so the live boards have something to show.
  const todayYmd = ymd(0);
  const todayDow = new Date(`${todayYmd}T00:00:00Z`).getUTCDay();
  if (todayDow !== 0 && todayDow !== 6) {
    for (const [u, time, status] of [
      [priya, '09:41', 'PRESENT'],
      [arjun, '09:55', 'PRESENT'],
      [meera, '10:27', 'LATE'],
    ] as const) {
      const checkIn = new Date(`${todayYmd}T${time}:00+05:30`);
      if (checkIn < new Date()) await prisma.attendance.create({ data: { companyId: company.id, userId: u.id, date: todayYmd, checkIn, status } });
    }
  }

  await prisma.activity.create({ data: { companyId: company.id, actorId: (founder ?? admin).id, message: 'created the Nimbus Labs workspace', createdAt: daysFromNow(-30) } });

  // Sign-in history for the security log, including a couple of failed attempts.
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0 Safari/537.36';
  const loginUsers = [admin, priya, rahul, sneha, arjun, meera, kabir];
  for (let d = 6; d >= 0; d--) {
    for (const [i, u] of loginUsers.entries()) {
      if ((i + d) % 3 === 0) continue;
      const at = daysFromNow(-d);
      at.setHours(9 + (i % 3), (i * 7) % 60);
      if (at > new Date()) continue;
      await prisma.loginEvent.create({ data: { companyId: company.id, userId: u.id, email: u.email, success: true, ip: `10.0.0.${10 + i}`, userAgent: ua, createdAt: at } });
      await prisma.user.update({ where: { id: u.id }, data: { lastLoginAt: at } });
    }
  }
  for (const d of [2, 1]) {
    await prisma.loginEvent.create({ data: { companyId: company.id, userId: rahul.id, email: rahul.email, success: false, ip: '103.21.44.7', userAgent: ua, createdAt: daysFromNow(-d) } });
  }

  // An invite that hasn't been accepted yet (its raw link is intentionally unknown).
  await prisma.invite.create({
    data: {
      companyId: company.id,
      invitedById: admin.id,
      email: 'ishaan@worknest.dev',
      name: 'Ishaan Kapoor',
      role: 'EMPLOYEE',
      designation: 'QA Engineer',
      tokenHash: 'seed-placeholder-not-a-real-token-hash',
      expiresAt: daysFromNow(6),
    },
  });

  // Other tenants, so the platform owner console shows a multi-company SaaS.
  const tenants: [string, number, string[]][] = [
    ['Pixel Forge Studio', -24, ['Ananya Rao', 'Dev Patel', 'Kiran Das']],
    ['Kraft Digital', -15, ['Rohan Malhotra', 'Isha Kulkarni']],
    ['Orbit Analytics', -8, ['Neha Bansal', 'Aditya Menon', 'Farhan Ali', 'Tanvi Shah']],
    ['Bluefin Labs', -2, ['Siddharth Jain']],
  ];
  for (const [name, created, people] of tenants) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const t = await prisma.company.create({ data: { name, slug, createdAt: daysFromNow(created) } });
    for (const [i, person] of people.entries()) {
      const email = `${person.split(' ')[0].toLowerCase()}@${slug}.demo`;
      await prisma.user.create({
        data: { companyId: t.id, name: person, email, role: i === 0 ? 'ADMIN' : 'EMPLOYEE', passwordHash, createdAt: daysFromNow(created), lastLoginAt: daysFromNow(-1) },
      });
    }
    const owner = await prisma.user.findFirstOrThrow({ where: { companyId: t.id, role: 'ADMIN' } });
    await prisma.project.create({ data: { companyId: t.id, name: `${name.split(' ')[0]} Website`, managerId: owner.id, status: 'ACTIVE' } });
    await prisma.activity.create({ data: { companyId: t.id, actorId: owner.id, message: `created the ${name} workspace`, createdAt: daysFromNow(created) } });
  }

  // The WorkNest founder: sees every tenant from the Platform console.
  const hq = await prisma.company.create({ data: { name: 'WorkNest HQ', slug: 'worknest-hq', createdAt: daysFromNow(-90) } });
  await prisma.user.create({
    data: { companyId: hq.id, name: 'WorkNest Owner', email: 'owner@worknest.dev', role: 'ADMIN', designation: 'Founder', isPlatformAdmin: true, passwordHash },
  });

  console.log('\nDemo data ready. Every demo account uses the password:', DEMO_PASSWORD);
  console.table([
    { role: 'Admin', email: 'admin@worknest.dev' },
    { role: 'Manager', email: 'manager@worknest.dev' },
    { role: 'Employee', email: 'employee@worknest.dev' },
    { role: 'Client (FreshCart)', email: 'client@worknest.dev' },
    { role: 'Platform owner (demo)', email: 'owner@worknest.dev' },
  ]);

  if (founder) {
    const link = await issuePasswordReset(founder.id, 7 * 24 * 60 * 60 * 1000);
    console.log(`\nOwner account: ${founder.email} (admin of Nimbus Labs + platform owner)`);
    console.log(`Set your password here (works once, valid 7 days):\n  ${link}\n`);
  } else {
    console.log('\nTip: set ADMIN_EMAIL in server/.env and re-run the seed to create your own owner account.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
