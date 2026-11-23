import type { TaskStatus } from "@/domain/tasks/task-status";
import type { BoardDependencies } from "../shared/dependencies";
import { fail, succeed, type Outcome } from "../shared/outcome";
import { missingBoardReason, runningRequestReason } from "./board-messages";

export type DeleteBoard = {
  kind: "DeleteBoard";
  id: string;
};

const blockingStatuses: readonly TaskStatus[] = ["in_progress", "qa"];

export const deleteBoard =
  (deps: BoardDependencies) =>
  async (command: DeleteBoard): Promise<Outcome<void>> => {
    const exists = (await deps.boards.list()).some((board) => board.id === command.id);

    if (!exists) {
      return fail(missingBoardReason);
    }

    const requestIds = new Set(
      (await deps.requests.list()).filter((request) => request.boardId === command.id).map((request) => request.id),
    );
    const running = (await deps.tasks.list()).some(
      (task) => requestIds.has(task.requestId) && blockingStatuses.includes(task.status),
    );

    if (running) {
      return fail(runningRequestReason);
    }

    const removed = await deps.boards.remove(command.id);

    return removed === "applied" ? succeed(undefined) : fail(missingBoardReason);
  };
