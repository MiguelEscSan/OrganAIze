import type { Task } from "@/domain/tasks/task";

export const buildTask = (overrides: Partial<Task> & Pick<Task, "id">): Task => ({
  requestId: "request-1",
  title: overrides.id,
  description: "",
  acceptanceCriteria: [],
  files: [],
  status: "definition",
  assignedAgent: null,
  attempts: 0,
  lastFeedback: null,
  reviewReason: null,
  parentTaskId: null,
  ...overrides,
});
