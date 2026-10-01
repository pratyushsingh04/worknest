import type { TaskStatus } from '@prisma/client';
import { prisma } from './prisma';
import { emit, rooms } from './socket';

export interface Progress {
  total: number;
  done: number;
  inProgress: number;
  percent: number;
}

const empty = (): Progress => ({ total: 0, done: 0, inProgress: 0, percent: 0 });

function finalize(p: Progress): Progress {
  p.percent = p.total === 0 ? 0 : Math.round((p.done / p.total) * 100);
  return p;
}

/** Task-completion progress for many projects in a single query. */
export async function progressFor(projectIds: string[]): Promise<Record<string, Progress>> {
  const result: Record<string, Progress> = Object.fromEntries(projectIds.map((id) => [id, empty()]));
  if (projectIds.length === 0) return result;

  const groups = await prisma.task.groupBy({
    by: ['projectId', 'status'],
    where: { projectId: { in: projectIds } },
    _count: { _all: true },
  });
  for (const g of groups) {
    const p = result[g.projectId];
    p.total += g._count._all;
    if (g.status === 'DONE') p.done += g._count._all;
    if (g.status === 'IN_PROGRESS' || g.status === 'IN_REVIEW') p.inProgress += g._count._all;
  }
  Object.values(result).forEach(finalize);
  return result;
}

export async function progressOf(projectId: string) {
  return (await progressFor([projectId]))[projectId];
}

/** Recomputes progress and pushes it to the team and the client portal. */
export async function broadcastProgress(projectId: string) {
  const progress = await progressOf(projectId);
  emit([rooms.project(projectId), rooms.projectClient(projectId)], 'project:progress', { projectId, progress });
  return progress;
}

export const statusLabel: Record<TaskStatus, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  IN_REVIEW: 'In review',
  DONE: 'Done',
};
