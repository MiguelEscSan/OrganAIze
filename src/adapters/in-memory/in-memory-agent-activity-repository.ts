import type { AgentActivityRecord } from "@/domain/agents/agent-activity";
import type { AgentActivityRepository } from "@/ports/agent-activity-repository";

export const createInMemoryAgentActivityRepository = (): AgentActivityRepository => {
  const byAgent = new Map<AgentActivityRecord["agent"], AgentActivityRecord>();

  return {
    list: async () => [...byAgent.values()],
    record: async (activity) => {
      byAgent.set(activity.agent, activity);
    },
  };
};
