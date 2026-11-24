import type { AgentActivityRecord } from "@/domain/agents/agent-activity";
import type { AgentActivityRepository } from "@/ports/agent-activity-repository";

export const withAgentActivity = async <T>(
  activity: AgentActivityRepository,
  working: AgentActivityRecord,
  idle: AgentActivityRecord,
  run: () => Promise<T>,
): Promise<T> => {
  await activity.record(working);

  try {
    return await run();
  } finally {
    await activity.record(idle);
  }
};
