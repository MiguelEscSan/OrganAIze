import type { TaskStatus } from "@/domain/tasks/task-status";
import type { TaskCardVariant } from "./task-card";

export const describeTaskState = (status: TaskStatus, variant: TaskCardVariant): string | null => {
  if (status === "qa" && variant === "request") {
    return "Testing the whole request";
  }

  if (status === "awaiting_release" && variant === "subtask") {
    return "Audited, waiting for the other subtasks";
  }

  return null;
};
