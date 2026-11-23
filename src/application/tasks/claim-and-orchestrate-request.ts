import type { Task } from "@/domain/tasks/task";
import { sendToReview } from "@/domain/tasks/send-to-review";
import { fail, type Outcome } from "../shared/outcome";
import { claimNextReadyTask } from "./claim-next-ready-task";
import { orchestrateRequest, type OrchestrationDependencies } from "./orchestrate-request";
import { conflictReason } from "./record-transition";

export type ClaimAndOrchestrateRequest = { kind: "ClaimAndOrchestrateRequest" };

const sendClaimedRequestToReview = async (
  deps: OrchestrationDependencies,
  taskId: string,
  reason: string,
): Promise<Outcome<Task[]>> => {
  const tasks = await deps.tasks.list();
  const result = sendToReview(tasks, taskId, reason);

  if (!result.ok) {
    return fail(reason);
  }

  const outcome = await deps.tasks.applyTransition({
    task: result.task,
    expectedStatus: "in_progress",
    event: result.event,
  });

  return outcome === "applied" ? fail(reason) : fail(conflictReason);
};

const splitUntilSettled = async (
  deps: OrchestrationDependencies,
  taskId: string,
  attemptsBefore: number,
): Promise<Outcome<Task[]>> => {
  const split = await orchestrateRequest(deps)({ kind: "OrchestrateRequest", taskId });

  if (split.ok) {
    return split;
  }

  const current = (await deps.tasks.list()).find((task) => task.id === taskId);

  if (!current || current.status !== "in_progress") {
    return split;
  }

  if (current.attempts === attemptsBefore) {
    return sendClaimedRequestToReview(deps, taskId, split.reason);
  }

  return splitUntilSettled(deps, taskId, current.attempts);
};

export const claimAndOrchestrateRequest =
  (deps: OrchestrationDependencies) =>
  async (): Promise<Outcome<Task[]>> => {
    const claimed = await claimNextReadyTask(deps)();

    if (!claimed.ok) {
      return fail(claimed.reason);
    }

    return splitUntilSettled(deps, claimed.value.id, claimed.value.attempts);
  };
