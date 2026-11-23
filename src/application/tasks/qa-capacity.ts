import type { Task } from "@/domain/tasks/task";

export const qaFullReason = (tasks: readonly Task[], maxQaTasks: number): string | undefined => {
  const tasksInQa = tasks.filter((task) => task.status === "qa").length;

  return tasksInQa >= maxQaTasks
    ? `QA is full: ${tasksInQa} of ${maxQaTasks} tasks are already in qa`
    : undefined;
};
