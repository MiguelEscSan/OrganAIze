import type { AgentActivityRecord } from "@/domain/agents/agent-activity";
import type { AgentActivityRepository } from "@/ports/agent-activity-repository";
import type { TaskRepository } from "@/ports/task-repository";
import type { ProgressReport } from "./streamed-llm";

type LiveProgressTargets = { activity: AgentActivityRepository; tasks: TaskRepository };

export const liveProgressOf =
  (targets: LiveProgressTargets, taskId: string, working: AgentActivityRecord, label: string): ProgressReport =>
  async (detail) => {
    await targets.activity.record({ ...working, message: `${working.message} · ${detail}` });
    await targets.tasks.setLiveStatus(taskId, `${label} · ${detail}`);
  };

export const withLiveStatus = async <T>(tasks: TaskRepository, taskId: string, run: () => Promise<T>): Promise<T> => {
  try {
    return await run();
  } finally {
    await tasks.setLiveStatus(taskId, null);
  }
};
