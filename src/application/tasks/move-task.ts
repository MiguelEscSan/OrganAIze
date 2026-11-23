import type { Task } from "@/domain/tasks/task";
import { transitionTask } from "@/domain/tasks/transition-task";
import type { ApplicationDependencies } from "../shared/dependencies";
import { fail, type Outcome } from "../shared/outcome";
import { recordTransition } from "./record-transition";

export type MoveTask = {
  kind: "MoveTask";
  taskId: string;
  to: "definition" | "ready";
};

export const moveTask =
  (deps: ApplicationDependencies) =>
  async (command: MoveTask): Promise<Outcome<Task>> => {
    const tasks = await deps.tasks.list();
    const before = tasks.find((task) => task.id === command.taskId);
    const result = transitionTask(tasks, command.taskId, command.to, "user");

    if (!result.ok || !before) {
      return fail(result.ok ? "Task not found" : result.reason);
    }

    const after = result.tasks.find((task) => task.id === command.taskId);

    if (!after) {
      return fail("Task not found");
    }

    return recordTransition(deps, before, after, result.event);
  };
