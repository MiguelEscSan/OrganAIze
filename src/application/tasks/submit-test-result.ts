import type { Task } from "@/domain/tasks/task";
import { rejectFromQa } from "@/domain/tasks/reject-task";
import { transitionTask } from "@/domain/tasks/transition-task";
import type { ApplicationDependencies } from "../shared/dependencies";
import { fail, type Outcome } from "../shared/outcome";
import { recordTransition } from "./record-transition";

export type TestVerdict = { passed: true } | { passed: false; feedback: string };

export type SubmitTestResult = {
  kind: "SubmitTestResult";
  taskId: string;
  verdict: TestVerdict;
};

export const submitTestResult =
  (deps: ApplicationDependencies) =>
  async (command: SubmitTestResult): Promise<Outcome<Task>> => {
    const tasks = await deps.tasks.list();
    const before = tasks.find((task) => task.id === command.taskId);
    const { verdict } = command;

    const result = verdict.passed
      ? transitionTask(tasks, command.taskId, "deploy", "system")
      : rejectFromQa(tasks, command.taskId, verdict.feedback);

    if (!result.ok || !before) {
      return fail(result.ok ? "Task not found" : result.reason);
    }

    const after = result.tasks.find((task) => task.id === command.taskId);

    if (!after) {
      return fail("Task not found");
    }

    return recordTransition(deps, before, after, result.event);
  };
