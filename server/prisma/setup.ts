// Creates the real workspace and its owner from server/.env. No demo data.
//   npm run db:setup           create the owner (or print a fresh set-password link)
//   npm run db:setup -- --fresh  wipe EVERYTHING first, then create the owner
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { issuePasswordReset } from '../src/lib/tokens';

const prisma = new PrismaClient();
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) throw new Error('Set ADMIN_EMAIL (and ADMIN_NAME, COMPANY_NAME) in server/.env first.');
  const name = process.env.ADMIN_NAME?.trim() || email.split('@')[0];
  const companyName = process.env.COMPANY_NAME?.trim() || 'My Company';

  if (process.argv.includes('--fresh')) {
    await prisma.company.deleteMany();
    console.log('Wiped all existing data.');
  }

  let owner = await prisma.user.findUnique({ where: { email } });
  if (owner?.lastLoginAt && !process.argv.includes('--new-link')) {
    // Already set up and signed in: nothing to do (safe to run on every server start).
    console.log(`Owner ${email} is already set up.`);
    return;
  }
  if (owner) {
    console.log(`Owner ${email} exists but has never signed in; issuing a new set-password link.`);
  } else {
    const slug = `${companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'company'}-${randomBytes(3).toString('hex')}`;
    owner = await prisma.user.create({
      data: {
        name,
        email,
        role: 'ADMIN',
        designation: 'Founder & CEO',
        department: 'Leadership',
        isPlatformAdmin: true,
        // Unusable until the owner picks a password through the link below.
        passwordHash: await bcrypt.hash(randomBytes(32).toString('hex'), 10),
        company: { create: { name: companyName, slug } },
      },
    });
    await prisma.activity.create({ data: { companyId: owner.companyId, actorId: owner.id, message: `created the ${companyName} workspace` } });
    console.log(`Created ${companyName} with ${name} <${email}> as founder, admin and platform owner.`);
  }

  const link = await issuePasswordReset(owner.id, SEVEN_DAYS);
  console.log(`\nSet your password (works once, valid 7 days):\n  ${link}\n`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
