import type { AgentName } from "@/domain/agents/agent-name";
import type { AgentActivityRecord } from "@/domain/agents/agent-activity";
import type { Task } from "@/domain/tasks/task";
import type { AgentActivityRepository } from "@/ports/agent-activity-repository";
import type { TaskRepository } from "@/ports/task-repository";

type ActivityDependencies = { activity: AgentActivityRepository; tasks: TaskRepository };

const isRunningAs = (agent: AgentName, task: Task): boolean => {
  if (!task.liveStatus) {
    return false;
  }

  if (agent === "testing") {
    return task.status === "qa";
  }

  const assigned = agent === "develop" ? "develop" : null;

  return task.status === "in_progress" && task.assignedAgent === assigned;
};

const stillRunningCount = async (tasks: TaskRepository, agent: AgentName): Promise<number> =>
  (await tasks.list()).filter((task) => isRunningAs(agent, task)).length;

const stillWorking = (working: AgentActivityRecord, count: number): AgentActivityRecord => ({
  ...working,
  message: `Working on ${count} ${count === 1 ? "subtask" : "subtasks"}`,
});

const recordAfterRun = async (
  tasks: TaskRepository,
  working: AgentActivityRecord,
  idle: AgentActivityRecord,
): Promise<AgentActivityRecord> => {
  const count = await stillRunningCount(tasks, working.agent);

  return count === 0 ? idle : stillWorking(working, count);
};

export const withAgentActivity = async <T>(
  { activity, tasks }: ActivityDependencies,
  working: AgentActivityRecord,
  idle: AgentActivityRecord,
  run: () => Promise<T>,
): Promise<T> => {
  await activity.record(working);

  try {
    return await run();
  } finally {
    await activity.record(await recordAfterRun(tasks, working, idle));
  }
};
