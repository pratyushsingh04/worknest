import { createServer } from 'node:http';
import { config } from './config';
import { createApp } from './app';
import { initSocket } from './lib/socket';
import { prisma } from './lib/prisma';
import { ensureOwner } from './lib/owner';

const server = createServer(createApp());
initSocket(server);

server.listen(config.port, () => {
  console.log(`WorkNest API listening on http://localhost:${config.port}`);
});

// On a hosted deploy there is no shell to run db:setup from, so do it at boot.
if (config.isProd) ensureOwner().catch((e) => console.error('Owner setup failed:', e instanceof Error ? e.message : e));

const shutdown = async () => {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
