import { createHash, randomBytes } from 'node:crypto';
import { config } from '../config';
import { prisma } from './prisma';

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/** A random 256-bit URL-safe token plus the hash we store instead of it. */
export function newToken(ttlMs: number) {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + ttlMs) };
}

export const RESET_TTL_MS = 60 * 60 * 1000;

/** Replaces any unused reset links for the user with a fresh one and returns its URL. */
export async function issuePasswordReset(userId: string, ttlMs = RESET_TTL_MS) {
  const { token, tokenHash, expiresAt } = newToken(ttlMs);
  await prisma.$transaction([
    prisma.passwordReset.deleteMany({ where: { userId, usedAt: null } }),
    prisma.passwordReset.create({ data: { userId, tokenHash, expiresAt } }),
  ]);
  return `${config.clientOrigin}/reset-password/${token}`;
}
