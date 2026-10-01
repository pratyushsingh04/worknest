"use client";

import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

/** One shared realtime connection, authenticated by the httpOnly session cookie. */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000", {
      withCredentials: true,
      transports: ["websocket"],
      // Fetched through the web origin (where the session cookie lives) on every (re)connect.
      auth: (cb) => {
        fetch("/api/auth/socket-token", { credentials: "include" })
          .then((r) => (r.ok ? r.json() : {}))
          .then((d: { token?: string }) => cb({ token: d.token }))
          .catch(() => cb({}));
      },
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
