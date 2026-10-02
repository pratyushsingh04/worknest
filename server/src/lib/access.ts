import type { Prisma } from '@prisma/client';
import type { AuthUser } from './auth';
import { prisma } from './prisma';

/** Prisma filter for the projects a user is allowed to see. */
export function projectScope(user: AuthUser): Prisma.ProjectWhereInput {
  // Clients see the projects delivered to them, whichever company runs them.
  if (user.role === 'CLIENT') return { client: { accountId: user.id } };
  const base = { companyId: user.companyId };
  switch (user.role) {
    case 'ADMIN':
      return base;
    case 'MANAGER':
      return { ...base, OR: [{ managerId: user.id }, { members: { some: { userId: user.id } } }, { team: { leadId: user.id } }] };
    case 'EMPLOYEE':
      return { ...base, members: { some: { userId: user.id } } };
  }
}

export function findAccessibleProject(user: AuthUser, projectId: string) {
  return prisma.project.findFirst({ where: { AND: [{ id: projectId }, projectScope(user)] }, include: { team: { select: { leadId: true } } } });
}

/** Admins manage every project; managers manage the ones they lead, directly or as team lead. */
export function canManageProject(user: AuthUser, project: { managerId: string | null; team?: { leadId?: string | null } | null }) {
  if (user.role === 'ADMIN') return true;
  if (user.role !== 'MANAGER') return false;
  return project.managerId === user.id || (!!project.team?.leadId && project.team.leadId === user.id);
}
