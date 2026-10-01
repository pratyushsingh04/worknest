// Creates the real workspace and its owner from server/.env. No demo data.
//   npm run db:setup           create the owner (or print a fresh set-password link)
//   npm run db:setup -- --fresh  wipe EVERYTHING first, then create the owner
import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { ensureOwner } from '../src/lib/owner';

async function main() {
  if (!process.env.ADMIN_EMAIL?.trim()) throw new Error('Set ADMIN_EMAIL (and ADMIN_NAME, COMPANY_NAME) in server/.env first.');

  if (process.argv.includes('--fresh')) {
    await prisma.company.deleteMany();
    console.log('Wiped all existing data.');
  }
  await ensureOwner({ newLink: process.argv.includes('--new-link') });
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
