import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { config } from '../config';

export interface AuthUser {
  id: string;
  companyId: string;
  role: Role;
  clientId: string | null;
}

export const AUTH_COOKIE = 'wn_token';
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

export function signToken(user: AuthUser, ttlSeconds = TOKEN_TTL_SECONDS): string {
  return jwt.sign(user, config.jwtSecret, { expiresIn: ttlSeconds });
}

export function verifyToken(token: string): AuthUser {
  const { id, companyId, role, clientId } = jwt.verify(token, config.jwtSecret) as AuthUser;
  return { id, companyId, role, clientId };
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: config.isProd,
  maxAge: TOKEN_TTL_SECONDS * 1000,
  path: '/',
};

/** Parses the auth cookie out of a raw Cookie header (used by Socket.io). */
export function tokenFromCookieHeader(header: string | undefined): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === AUTH_COOKIE) return decodeURIComponent(rest.join('='));
  }
  return null;
}
