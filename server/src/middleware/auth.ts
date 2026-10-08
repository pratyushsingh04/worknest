import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { AUTH_COOKIE, verifyToken, type AuthUser } from '../lib/auth';
import { forbidden, unauthorized } from '../lib/errors';
import { prisma } from '../lib/prisma';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Looking the account up on every request costs a database round trip each time, so the answer
// is remembered briefly. Changing someone's role or deactivating them clears it at once.
const SESSION_TTL_MS = 30_000;
const sessions = new Map<string, { user: AuthUser | null; expires: number }>();

export function forgetSession(userId: string) {
  sessions.delete(userId);
}

async function accountFor(id: string): Promise<AuthUser | null> {
  const hit = sessions.get(id);
  if (hit && hit.expires > Date.now()) return hit.user;
  const row = await prisma.user.findUnique({ where: { id }, select: { id: true, companyId: true, role: true, isActive: true } });
  const user = row?.isActive ? { id: row.id, companyId: row.companyId ?? '', role: row.role } : null;
  if (sessions.size > 5000) sessions.clear();
  sessions.set(id, { user, expires: Date.now() + SESSION_TTL_MS });
  return user;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = req.cookies?.[AUTH_COOKIE] ?? (header?.startsWith('Bearer ') ? header.slice(7) : undefined);
  if (!token) return next(unauthorized());
  let claims: AuthUser;
  try {
    claims = verifyToken(token);
  } catch {
    return next(unauthorized('Session expired, please sign in again'));
  }
  // The token only proves identity. Role and status come from the database, so a
  // deactivated account or a changed role takes effect right away, not when the token expires.
  const user = await accountFor(claims.id);
  if (!user) return next(unauthorized('This account is no longer active'));
  req.user = user;
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}

/** Everyone who works inside a company. Clients are kept out of workspace routes with this. */
export const requireStaff = requireRole('ADMIN', 'MANAGER', 'EMPLOYEE');

/** Only call after requireAuth. */
export function currentUser(req: Request): AuthUser {
  if (!req.user) throw unauthorized();
  return req.user;
}

/** Route params as a plain string (Express 5 types them as string | string[]). */
export function param(req: Request, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value;
}
