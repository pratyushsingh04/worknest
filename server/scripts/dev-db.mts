// Runs a real PostgreSQL server locally without Docker, for development only.
// In production, DATABASE_URL points to AWS RDS instead.
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync, rmSync } from 'node:fs';
import { connect } from 'node:net';
import { resolve } from 'node:path';

const dataDir = resolve(process.cwd(), '.pgdata');
const pidFile = resolve(dataDir, 'postmaster.pid');
const PORT = 5433;

/** True if something is already accepting connections on the Postgres port. */
function portOpen(port: number): Promise<boolean> {
  return new Promise((done) => {
    const socket = connect({ port, host: '127.0.0.1' });
    socket.once('connect', () => {
      socket.destroy();
      done(true);
    });
    socket.once('error', () => done(false));
    socket.setTimeout(1500, () => {
      socket.destroy();
      done(false);
    });
  });
}

if (await portOpen(PORT)) {
  console.log(`Postgres is already running on localhost:${PORT}`);
  setInterval(() => {}, 1 << 30); // stay up so "npm run dev" keeps going
  await new Promise(() => {});
}

// After a crash or reboot Postgres leaves its lock file behind and refuses to start.
// Nothing is listening on the port, so the lock is stale and safe to remove.
// (The PID inside it can't be trusted: Windows may have reused it for another program.)
if (existsSync(pidFile)) {
  console.log('Removing stale Postgres lock file from a previous run...');
  rmSync(pidFile, { force: true });
}

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'postgres',
  password: 'postgres',
  port: PORT,
  persistent: true,
});

if (!existsSync(dataDir)) {
  console.log('Initialising local Postgres data directory...');
  await pg.initialise();
}
await pg.start();
try {
  await pg.createDatabase('worknest');
  console.log('Created database "worknest"');
} catch {
  // already exists
}
console.log(`Postgres running on localhost:${PORT} (Ctrl+C to stop)`);

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
