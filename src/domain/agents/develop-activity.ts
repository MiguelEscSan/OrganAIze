import type { Task } from "../tasks/task";

export type AgentActivity = { state: "idle" | "working"; message: string };

export const developActivity = (tasks: readonly Task[]): AgentActivity => {
  const running = tasks.find((task) => task.assignedAgent === "develop" && task.status === "in_progress");

  return running
    ? { state: "working", message: `Working on "${running.title}"` }
    : { state: "idle", message: "No subtask is waiting for Develop" };
};
