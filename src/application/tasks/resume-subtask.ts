import type { Task } from "@/domain/tasks/task";
import { fail, succeed, type Outcome } from "../shared/outcome";
import { resumeSubtasks } from "./claim-and-orchestrate-request";
import type { OrchestrationDependencies } from "./orchestrate-request";
import type { DevelopDependencies } from "./run-develop";

export type ResumeSubtask = { kind: "ResumeSubtask"; taskId: string };

const resumableReason = "Only a develop subtask in progress can be resumed";

export const resumeSubtask =
  (deps: OrchestrationDependencies & DevelopDependencies) =>
  async (command: ResumeSubtask): Promise<Outcome<Task>> => {
    const tasks = await deps.tasks.list();
    const subtask = tasks.find((task) => task.id === command.taskId);

    if (
      !subtask ||
      subtask.parentTaskId === null ||
      subtask.status !== "in_progress" ||
      subtask.assignedAgent !== "develop"
    ) {
      return fail(resumableReason);
    }

    await resumeSubtasks(deps)(subtask.parentTaskId);

    const current = (await deps.tasks.list()).find((task) => task.id === command.taskId);

    return current ? succeed(current) : fail(resumableReason);
  };
