import type { AgentActivityRecord } from "@/domain/agents/agent-activity";

export interface AgentActivityRepository {
  list(): Promise<AgentActivityRecord[]>;
  record(activity: AgentActivityRecord): Promise<void>;
}
