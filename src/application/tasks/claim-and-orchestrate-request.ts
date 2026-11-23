import type { Task } from "@/domain/tasks/task";
import { fail, type Outcome } from "../shared/outcome";
import { claimNextReadyTask } from "./claim-next-ready-task";
import { orchestrateRequest, type OrchestrationDependencies } from "./orchestrate-request";

export type ClaimAndOrchestrateRequest = { kind: "ClaimAndOrchestrateRequest" };

export const claimAndOrchestrateRequest =
  (deps: OrchestrationDependencies) =>
  async (): Promise<Outcome<Task[]>> => {
    const claimed = await claimNextReadyTask(deps)();

    if (!claimed.ok) {
      return fail(claimed.reason);
    }

    return orchestrateRequest(deps)({ kind: "OrchestrateRequest", taskId: claimed.value.id });
  };
