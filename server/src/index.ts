import { createServer } from 'node:http';
import { config } from './config';
import { createApp } from './app';
import { initSocket } from './lib/socket';
import { prisma } from './lib/prisma';

const server = createServer(createApp());
initSocket(server);

server.listen(config.port, () => {
  console.log(`WorkNest API listening on http://localhost:${config.port}`);
});

const shutdown = async () => {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
