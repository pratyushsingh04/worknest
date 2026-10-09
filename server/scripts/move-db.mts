// Copies every row from one Postgres database to another (for example from the host's
// expiring free database to a permanent one). The new database must already have the
// tables (`prisma db push`) and must be empty.
//
//   1. Put both connection strings in server/.env.migrate (never committed):
//        OLD_DATABASE_URL=postgresql://...
//        NEW_DATABASE_URL=postgresql://...
//   2. npm run db:move
//
// It only reads from the old database. Run it again with --wipe to empty the new one first.
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { config as loadEnv } from 'dotenv';
import { Prisma, PrismaClient } from '@prisma/client';

if (existsSync('.env.migrate')) loadEnv({ path: '.env.migrate', override: true });
const OLD = process.env.OLD_DATABASE_URL?.trim();
const NEW = process.env.NEW_DATABASE_URL?.trim();
if (!OLD || !NEW) {
  console.error('Set OLD_DATABASE_URL and NEW_DATABASE_URL in server/.env.migrate first.');
  process.exit(1);
}
if (OLD === NEW) {
  console.error('OLD_DATABASE_URL and NEW_DATABASE_URL are the same database.');
  process.exit(1);
}
const wipe = process.argv.includes('--wipe');
// Never print a connection string: it contains the password.
const host = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return '(unreadable address)';
  }
};

const from = new PrismaClient({ datasourceUrl: OLD });
const to = new PrismaClient({ datasourceUrl: NEW });
const models = Prisma.dmmf.datamodel.models;
type Row = Record<string, unknown>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = (client: PrismaClient, model: string) => (client as any)[model[0].toLowerCase() + model.slice(1)];

/** Columns that point at another row and may be empty: filled in after every row exists. */
const optionalLinks = (m: (typeof models)[number]) =>
  m.fields.filter((f) => f.kind === 'object' && f.relationFromFields?.length && !f.isRequired).flatMap((f) => f.relationFromFields as string[]);
/** Tables whose rows must exist before this one's can be inserted. */
const needs = (m: (typeof models)[number]) => m.fields.filter((f) => f.kind === 'object' && f.relationFromFields?.length && f.isRequired && f.type !== m.name).map((f) => f.type);

function insertOrder() {
  const done: string[] = [];
  const left = new Map(models.map((m) => [m.name, needs(m)]));
  while (left.size) {
    const ready = [...left].filter(([, deps]) => deps.every((d) => done.includes(d))).map(([name]) => name);
    if (!ready.length) throw new Error(`Tables depend on each other in a loop: ${[...left.keys()].join(', ')}`);
    for (const name of ready) {
      done.push(name);
      left.delete(name);
    }
  }
  return done;
}

function keyOf(m: (typeof models)[number], row: Row) {
  const id = m.fields.find((f) => f.isId);
  if (id) return { [id.name]: row[id.name] };
  const fields = m.primaryKey!.fields;
  return { [m.primaryKey!.name ?? fields.join('_')]: Object.fromEntries(fields.map((f) => [f, row[f]])) };
}

async function main() {
  console.log(`From ${host(OLD!)}\nTo   ${host(NEW!)}\n`);
  console.log('Creating the tables in the new database...');
  execSync('npx prisma db push --skip-generate', { env: { ...process.env, DATABASE_URL: NEW }, stdio: ['ignore', 'ignore', 'inherit'] });

  const order = insertOrder();
  if (wipe) for (const name of [...order].reverse()) await table(to, name).deleteMany();
  for (const name of order) {
    if ((await table(to, name).count()) > 0) throw new Error(`The new database already has rows in ${name}. Run again with --wipe to empty it first.`);
  }

  const later: { model: (typeof models)[number]; row: Row; links: string[] }[] = [];
  for (const name of order) {
    const model = models.find((m) => m.name === name)!;
    const links = optionalLinks(model);
    const json = model.fields.filter((f) => f.type === 'Json').map((f) => f.name);
    const rows: Row[] = await table(from, name).findMany();
    const data = rows.map((row) => {
      const copy: Row = { ...row };
      for (const f of json) if (copy[f] === null) copy[f] = Prisma.DbNull;
      if (links.some((f) => row[f] !== null)) later.push({ model, row, links });
      for (const f of links) copy[f] = null;
      return copy;
    });
    for (let i = 0; i < data.length; i += 500) await table(to, name).createMany({ data: data.slice(i, i + 500) });
    console.log(`  ${name.padEnd(16)} ${rows.length}`);
  }

  for (const { model, row, links } of later) {
    // Timestamps Prisma would otherwise bump (updatedAt) are written back as they were.
    const stamps = model.fields.filter((f) => f.isUpdatedAt).map((f) => f.name);
    await table(to, model.name).update({ where: keyOf(model, row), data: Object.fromEntries([...links, ...stamps].map((f) => [f, row[f]])) });
  }

  let same = true;
  for (const name of order) {
    const [a, b] = await Promise.all([table(from, name).count(), table(to, name).count()]);
    if (a !== b) {
      same = false;
      console.error(`  MISMATCH in ${name}: ${a} rows before, ${b} after`);
    }
  }
  if (!same) throw new Error('The copy is incomplete. Nothing was changed in the old database; fix the problem and run again with --wipe.');
  console.log('\nEvery table has the same number of rows in both databases. Now point DATABASE_URL on the host at the new one and deploy.');
}

main()
  .catch((e) => {
    console.error('\nStopped:', e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => Promise.all([from.$disconnect(), to.$disconnect()]));
