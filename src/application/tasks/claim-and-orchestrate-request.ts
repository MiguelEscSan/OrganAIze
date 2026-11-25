import type { Task } from "@/domain/tasks/task";
import { sendToReview } from "@/domain/tasks/send-to-review";
import { fail, type Outcome } from "../shared/outcome";
import { claimNextReadyTask } from "./claim-next-ready-task";
import { orchestrateRequest, type OrchestrationDependencies } from "./orchestrate-request";
import { conflictReason } from "./record-transition";
import type { DevelopDependencies } from "./run-develop";
import { runDevelopSubtasks } from "./run-develop-subtasks";
import { runTesting } from "../testing/run-testing";

export type ClaimAndOrchestrateRequest = { kind: "ClaimAndOrchestrateRequest" };

const fallbackReviewReason = "Orchestration failed without a reason";

const testSubtasksSafely = async (deps: DevelopDependencies): Promise<void> => {
  try {
    await runTesting(deps)();
  } catch {
    return;
  }
};

const sendClaimedRequestToReview = async (
  deps: OrchestrationDependencies,
  taskId: string,
  failureReason: string,
): Promise<Outcome<Task[]>> => {
  const reason = failureReason.trim().length > 0 ? failureReason : fallbackReviewReason;
  const tasks = await deps.tasks.list();
  const result = sendToReview(tasks, taskId, reason);

  if (!result.ok) {
    return fail(result.reason);
  }

  const outcome = await deps.tasks.applyTransition({
    task: result.task,
    expectedStatus: "in_progress",
    event: result.event,
  });

  return outcome === "applied" ? fail(reason) : fail(conflictReason);
};

const subtaskSnapshot = async (deps: OrchestrationDependencies, parentTaskId: string): Promise<string> =>
  (await deps.tasks.list())
    .filter((task) => task.parentTaskId === parentTaskId)
    .map((task) => `${task.id}:${task.status}:${task.attempts}`)
    .join("|");

const hasDevelopWork = async (deps: OrchestrationDependencies, parentTaskId: string): Promise<boolean> =>
  (await deps.tasks.list()).some(
    (task) => task.parentTaskId === parentTaskId && task.status === "in_progress" && task.assignedAgent === "develop",
  );

const developAndTestUntilSettled = async (deps: OrchestrationDependencies & DevelopDependencies, parentTaskId: string) => {
  for (;;) {
    const before = await subtaskSnapshot(deps, parentTaskId);

    await runDevelopSubtasks(deps)(parentTaskId);
    await testSubtasksSafely(deps);

    const after = await subtaskSnapshot(deps, parentTaskId);

    if (before === after || !(await hasDevelopWork(deps, parentTaskId))) {
      return;
    }
  }
};

export const resumeSubtasks =
  (deps: OrchestrationDependencies & DevelopDependencies) =>
  (parentTaskId: string): Promise<void> =>
    developAndTestUntilSettled(deps, parentTaskId);

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
  (deps: OrchestrationDependencies & DevelopDependencies) =>
  async (): Promise<Outcome<Task[]>> => {
    const claimed = await claimNextReadyTask(deps)();

    if (!claimed.ok) {
      return fail(claimed.reason);
    }

    const split = await splitUntilSettled(deps, claimed.value.id, claimed.value.attempts);

    if (split.ok) {
      await developAndTestUntilSettled(deps, claimed.value.id);
    }

    return split;
  };
