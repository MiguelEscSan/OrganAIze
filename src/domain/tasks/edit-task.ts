import type { Task } from "./task";

export type TaskDetails = {
  title: string;
  description: string;
};

export type EditResult =
  | { ok: true; tasks: Task[] }
  | { ok: false; reason: string };

export const editTaskDetails = (
  tasks: readonly Task[],
  taskId: string,
  details: TaskDetails,
): EditResult => {
  const task = tasks.find((candidate) => candidate.id === taskId);

  if (!task) {
    return { ok: false, reason: "Task not found" };
  }

  if (task.status !== "definition") {
    return { ok: false, reason: "Only tasks in definition can be edited" };
  }

  if (details.title.trim().length === 0) {
    return { ok: false, reason: "A task needs a title" };
  }

  return {
    ok: true,
    tasks: tasks.map((candidate) =>
      candidate.id === taskId
        ? { ...candidate, title: details.title.trim(), description: details.description }
        : candidate,
    ),
  };
};

export const deleteTask = (tasks: readonly Task[], taskId: string): EditResult => {
  const task = tasks.find((candidate) => candidate.id === taskId);

  if (!task) {
    return { ok: false, reason: "Task not found" };
  }

  if (task.status !== "definition") {
    return { ok: false, reason: "Only tasks in definition can be deleted" };
  }

  return { ok: true, tasks: tasks.filter((candidate) => candidate.id !== taskId) };
};
