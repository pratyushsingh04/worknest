import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';

/**
 * A client account's entry in one company's books. Created the first time the
 * client deals with that company, so their projects have someone to belong to.
 */
export async function ensureClientRecord(companyId: string, accountId: string, tx: Prisma.TransactionClient = prisma) {
  const existing = await tx.client.findFirst({ where: { companyId, accountId } });
  if (existing) return existing;
  const account = await tx.user.findUniqueOrThrow({ where: { id: accountId }, select: { name: true, email: true, organisation: true } });
  return tx.client.create({ data: { companyId, accountId, name: account.organisation || account.name, contactEmail: account.email } });
}
