import type { AgentActivityRecord } from "@/domain/agents/agent-activity";
import type { AgentActivityRepository } from "@/ports/agent-activity-repository";
import type { TaskRepository } from "@/ports/task-repository";
import type { ProgressReport } from "./streamed-llm";

type LiveProgressTargets = { activity: AgentActivityRepository; tasks: TaskRepository };

export type StepReporter = { announce: ProgressReport; streamed: ProgressReport };

export const noAnnouncement: ProgressReport = async () => undefined;

export const liveStepsOf = (targets: LiveProgressTargets, taskId: string, working: AgentActivityRecord): StepReporter => {
  let currentStep = working.message;

  const publish = async (message: string): Promise<void> => {
    await targets.activity.record({ ...working, message });
    await targets.tasks.setLiveStatus(taskId, message);
  };

  return {
    announce: async (step) => {
      currentStep = step;
      await publish(step);
    },
    streamed: (detail) => publish(`${currentStep} · ${detail}`),
  };
};

export const withLiveStatus = async <T>(tasks: TaskRepository, taskId: string, run: () => Promise<T>): Promise<T> => {
  try {
    return await run();
  } finally {
    await tasks.setLiveStatus(taskId, null);
  }
};
