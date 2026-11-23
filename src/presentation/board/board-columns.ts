import type { TaskStatus } from "@/domain/tasks/task-status";

export type BoardColumn = {
  status: TaskStatus;
  title: string;
  accentClass: string;
};

export const boardColumns: readonly BoardColumn[] = [
  { status: "ready", title: "Ready to develop", accentClass: "bg-muted" },
  { status: "in_progress", title: "In progress", accentClass: "bg-sky" },
  { status: "qa", title: "QA", accentClass: "bg-amber" },
  { status: "deploy", title: "Deploy", accentClass: "bg-sage" },
];
