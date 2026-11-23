import type { Task } from "@/domain/tasks/task";
import type { BoardRepository } from "@/ports/board-repository";
import type { RequestRepository } from "@/ports/request-repository";
import { fail, succeed, type Outcome } from "./outcome";

export type TaskWorkspaceDependencies<Workspace> = {
  requests: RequestRepository;
  boards: BoardRepository;
  workspaceFor: (rootPath: string) => Workspace;
};

export const workspaceOfTask = async <Workspace>(
  deps: TaskWorkspaceDependencies<Workspace>,
  task: Task,
): Promise<Outcome<Workspace>> => {
  const request = (await deps.requests.list()).find((candidate) => candidate.id === task.requestId);
  const board = request ? (await deps.boards.list()).find((candidate) => candidate.id === request.boardId) : undefined;

  return board ? succeed(deps.workspaceFor(board.rootPath)) : fail("The board for this task was not found");
};
