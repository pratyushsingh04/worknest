import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { config } from '../config';
import { tokenFromCookieHeader, verifyToken, type AuthUser } from './auth';
import { findAccessibleProject } from './access';
import { prisma } from './prisma';

let io: Server | null = null;

export const rooms = {
  company: (companyId: string) => `company:${companyId}`,
  project: (projectId: string) => `project:${projectId}`,
  // Clients only receive the client-visible slice of project events.
  projectClient: (projectId: string) => `project-client:${projectId}`,
  user: (userId: string) => `user:${userId}`,
};

export function initSocket(server: HttpServer) {
  io = new Server(server, { cors: { origin: config.clientOrigin, credentials: true } });

  io.use(async (socket, next) => {
    const token = (socket.handshake.auth?.token as string | undefined) ?? tokenFromCookieHeader(socket.handshake.headers.cookie);
    if (!token) return next(new Error('unauthorized'));
    try {
      const claims = verifyToken(token);
      const user = await prisma.user.findUnique({ where: { id: claims.id }, select: { id: true, companyId: true, role: true, clientId: true, isActive: true } });
      if (!user?.isActive) return next(new Error('unauthorized'));
      socket.data.user = { id: user.id, companyId: user.companyId, role: user.role, clientId: user.clientId };
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as AuthUser;
    socket.join(rooms.user(user.id));
    if (user.role !== 'CLIENT') socket.join(rooms.company(user.companyId));

    // Joining a project room is authorised the same way as the REST API.
    socket.on('project:join', async (projectId: string) => {
      const project = await findAccessibleProject(user, projectId);
      if (!project) return;
      socket.join(user.role === 'CLIENT' ? rooms.projectClient(projectId) : rooms.project(projectId));
    });
    socket.on('project:leave', (projectId: string) => {
      socket.leave(rooms.project(projectId));
      socket.leave(rooms.projectClient(projectId));
    });
  });
}

export function emit(room: string | string[], event: string, payload: unknown) {
  io?.to(room).emit(event, payload);
}
