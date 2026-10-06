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
  call: (meetingId: string) => `call:${meetingId}`,
};

export function initSocket(server: HttpServer) {
  io = new Server(server, { cors: { origin: config.clientOrigin, credentials: true } });

  io.use(async (socket, next) => {
    const token = (socket.handshake.auth?.token as string | undefined) ?? tokenFromCookieHeader(socket.handshake.headers.cookie);
    if (!token) return next(new Error('unauthorized'));
    try {
      const claims = verifyToken(token);
      const user = await prisma.user.findUnique({ where: { id: claims.id }, select: { id: true, companyId: true, role: true, isActive: true } });
      if (!user?.isActive) return next(new Error('unauthorized'));
      socket.data.user = { id: user.id, companyId: user.companyId ?? '', role: user.role };
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

    // ---- In-app video calls -------------------------------------------------
    // The server only introduces people and passes their connection details along;
    // audio and video travel directly between the browsers.
    const leaveCall = () => {
      const meetingId = socket.data.callId as string | undefined;
      if (!meetingId) return;
      socket.data.callId = undefined;
      socket.leave(rooms.call(meetingId));
      socket.to(rooms.call(meetingId)).emit('call:peer-left', { peerId: socket.id });
    };

    socket.on('call:join', async (meetingId: unknown, ack?: (res: { error?: string; peers?: CallPeer[]; self?: CallPeer }) => void) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      if (typeof meetingId !== 'string' || user.role === 'CLIENT') return reply({ error: 'Meeting not found' });
      // Only people invited to the meeting (or an admin of the company) may enter its call.
      const meeting = await prisma.meeting.findFirst({
        where: { id: meetingId, companyId: user.companyId, ...(user.role === 'ADMIN' ? {} : { OR: [{ organiserId: user.id }, { attendees: { some: { userId: user.id } } }] }) },
        select: { id: true },
      });
      if (!meeting) return reply({ error: 'Meeting not found' });

      leaveCall();
      const room = rooms.call(meetingId);
      const others = await io!.in(room).fetchSockets();
      if (others.length >= MAX_CALL_SIZE) return reply({ error: `This call is full (${MAX_CALL_SIZE} people).` });

      const me = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true } });
      const self: CallPeer = { peerId: socket.id, userId: user.id, name: me?.name ?? 'Someone' };
      socket.data.callId = meetingId;
      socket.data.callPeer = self;
      socket.join(room);
      socket.to(room).emit('call:peer-joined', self);
      reply({ self, peers: others.map((s) => s.data.callPeer as CallPeer).filter(Boolean) });
    });

    // Offers, answers and network candidates, relayed only between two people in the same call.
    socket.on('call:signal', (msg: { to?: unknown; data?: unknown }) => {
      const meetingId = socket.data.callId as string | undefined;
      if (!meetingId || typeof msg?.to !== 'string') return;
      const target = io!.sockets.sockets.get(msg.to);
      if (!target || target.data.callId !== meetingId) return;
      target.emit('call:signal', { from: socket.id, data: msg.data });
    });

    // Mic and camera state, so others can show who is muted.
    socket.on('call:state', (state: { audio?: unknown; video?: unknown; screen?: unknown }) => {
      const meetingId = socket.data.callId as string | undefined;
      if (!meetingId) return;
      socket.to(rooms.call(meetingId)).emit('call:state', { peerId: socket.id, audio: !!state?.audio, video: !!state?.video, screen: !!state?.screen });
    });

    socket.on('call:leave', leaveCall);
    socket.on('disconnect', leaveCall);
  });
}

/** Calls connect everyone to everyone, which stops working well beyond a small group. */
const MAX_CALL_SIZE = 8;

interface CallPeer {
  peerId: string;
  userId: string;
  name: string;
}

export function emit(room: string | string[], event: string, payload: unknown) {
  io?.to(room).emit(event, payload);
}
