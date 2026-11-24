import type { AgentActivityRecord } from "@/domain/agents/agent-activity";
import type { ApplicationDependencies } from "../shared/dependencies";

export const listAgentActivity = (deps: ApplicationDependencies) => (): Promise<AgentActivityRecord[]> =>
  deps.activity.list();
