import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { prisma } from './prisma';
import { issuePasswordReset } from './tokens';

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

/**
 * Makes sure the workspace owner from ADMIN_EMAIL exists and prints a set-password link
 * until they have signed in once. Safe to run on every server start.
 */
export async function ensureOwner({ newLink = false } = {}) {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) return false;
  const name = process.env.ADMIN_NAME?.trim() || email.split('@')[0];
  const companyName = process.env.COMPANY_NAME?.trim() || 'My Company';

  let owner = await prisma.user.findUnique({ where: { email } });
  if (owner?.lastLoginAt && !newLink) {
    console.log(`Owner ${email} is already set up.`);
    return true;
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
  return true;
}
