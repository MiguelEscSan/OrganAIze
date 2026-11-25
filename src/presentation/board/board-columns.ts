import type { TaskStatus } from "@/domain/tasks/task-status";

export type BoardColumn = {
  status: TaskStatus;
  title: string;
  accentClass: string;
  hint: string;
  isAutomatic: boolean;
};

export const boardColumns: readonly BoardColumn[] = [
  {
    status: "definition",
    title: "Definition",
    accentClass: "bg-plum",
    hint: "You write and move cards from here",
    isAutomatic: false,
  },
  {
    status: "ready",
    title: "Ready to develop",
    accentClass: "bg-muted",
    hint: "Queue, first in, first out",
    isAutomatic: false,
  },
  {
    status: "in_progress",
    title: "In progress",
    accentClass: "bg-sky",
    hint: "Automatic, one request at a time",
    isAutomatic: true,
  },
  { status: "qa", title: "QA", accentClass: "bg-amber", hint: "Automatic", isAutomatic: true },
  {
    status: "review",
    title: "Review",
    accentClass: "bg-terracotta",
    hint: "You decide what happens next",
    isAutomatic: false,
  },
  {
    status: "deploy",
    title: "Deploy",
    accentClass: "bg-sage",
    hint: "Done, passed all criteria",
    isAutomatic: true,
  },
];
