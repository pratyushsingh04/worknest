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
  // deactivated account or a changed role takes effect immediately, not when the token expires.
  const user = await prisma.user.findUnique({ where: { id: claims.id }, select: { id: true, companyId: true, role: true, clientId: true, isActive: true } });
  if (!user || !user.isActive) return next(unauthorized('This account is no longer active'));
  req.user = { id: user.id, companyId: user.companyId, role: user.role, clientId: user.clientId };
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}

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
