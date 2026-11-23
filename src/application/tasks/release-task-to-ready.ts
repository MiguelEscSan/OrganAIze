import type { Task } from "@/domain/tasks/task";
import { succeed, type Outcome } from "../shared/outcome";
import { claimAndOrchestrateRequest } from "./claim-and-orchestrate-request";
import { moveTask } from "./move-task";
import type { OrchestrationDependencies } from "./orchestrate-request";
import type { DevelopDependencies } from "./run-develop";

export type ReleaseTaskToReady = { kind: "ReleaseTaskToReady"; taskId: string };

export const releaseTaskToReady =
  (deps: OrchestrationDependencies & DevelopDependencies) =>
  async (command: ReleaseTaskToReady): Promise<Outcome<Task>> => {
    const moved = await moveTask(deps)({ kind: "MoveTask", taskId: command.taskId, to: "ready" });

    if (!moved.ok) {
      return moved;
    }

    await claimAndOrchestrateRequest(deps)();

    const current = (await deps.tasks.list()).find((task) => task.id === command.taskId);

    return current ? succeed(current) : moved;
  };
