import { groupTasksByStatus, type TasksByStatus } from "@/domain/tasks/group-tasks-by-status";
import type { Task } from "@/domain/tasks/task";
import type { ApplicationDependencies } from "../shared/dependencies";

export type ListBoard = { kind: "ListBoard"; boardId?: string };

const tasksOfBoard = async (deps: ApplicationDependencies, boardId: string): Promise<Task[]> => {
  const requestIds = new Set((await deps.requests.list()).filter((request) => request.boardId === boardId).map((request) => request.id));

  return (await deps.tasks.list()).filter((task) => requestIds.has(task.requestId));
};

export const listBoard =
  (deps: ApplicationDependencies) =>
  async (query: ListBoard): Promise<TasksByStatus> =>
    groupTasksByStatus(query.boardId === undefined ? await deps.tasks.list() : await tasksOfBoard(deps, query.boardId));
