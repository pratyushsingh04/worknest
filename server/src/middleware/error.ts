import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { HttpError } from '../lib/errors';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err instanceof ZodError) {
    const first = err.issues[0];
    return res.status(400).json({ error: `${first.path.join('.') || 'input'}: ${first.message}`, issues: err.issues });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    return res.status(409).json({ error: 'A record with these details already exists' });
  }
  if (err instanceof Prisma.PrismaClientInitializationError) {
    console.error('Database unreachable. Is "npm run db:start" running?');
    return res.status(503).json({ error: 'The database is not reachable right now. Please try again in a moment.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
}
