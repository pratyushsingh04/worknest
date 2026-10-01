import { prisma } from './prisma';
import { emit, rooms } from './socket';

interface ActivityInput {
  companyId: string;
  actorId: string;
  message: string;
  projectId?: string;
  clientVisible?: boolean;
}

/** Stores an activity row and pushes it to everyone watching in real time. */
export async function logActivity(input: ActivityInput) {
  const activity = await prisma.activity.create({
    data: {
      companyId: input.companyId,
      actorId: input.actorId,
      message: input.message,
      projectId: input.projectId,
      clientVisible: input.clientVisible ?? false,
    },
    include: { actor: { select: { id: true, name: true } } },
  });

  const targets = [rooms.company(input.companyId)];
  if (input.projectId) {
    targets.push(rooms.project(input.projectId));
    if (activity.clientVisible) targets.push(rooms.projectClient(input.projectId));
  }
  emit(targets, 'activity:new', activity);
  return activity;
}
