import type { Task } from "@/domain/tasks/task";
import { rejectFromQa } from "@/domain/tasks/reject-task";
import { transitionTask } from "@/domain/tasks/transition-task";
import type { ApplicationDependencies } from "../shared/dependencies";
import { fail, succeed, type Outcome } from "../shared/outcome";
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
    const { verdict } = command;

    const result = verdict.passed
      ? transitionTask(tasks, command.taskId, "deploy", "system")
      : rejectFromQa(tasks, command.taskId, verdict.feedback);

    if (!result.ok) {
      return fail(result.reason);
    }

    await recordTransition(deps, result.tasks, result.event);

    const updated = result.tasks.find((task) => task.id === command.taskId);

    return updated ? succeed(updated) : fail("Task not found");
  };
