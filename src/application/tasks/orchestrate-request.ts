import type { Request } from "@/domain/requests/request";
import type { Task } from "@/domain/tasks/task";
import { parseOrchestrationPlan, type OrchestrationPlan } from "@/domain/agents/orchestration-plan";
import type { ApplicationDependencies } from "../shared/dependencies";
import { fail, succeed, type Outcome } from "../shared/outcome";
import type { LlmClient } from "@/ports/llm-client";

export type OrchestrateRequest = {
  kind: "OrchestrateRequest";
  taskId: string;
};

export type OrchestrationDependencies = ApplicationDependencies & { llm: LlmClient };

const planPrompt = (request: Request, plan: { title: string; description: string }): string =>
  [
    "You split one software request into subtasks for a developer agent.",
    `Request title: ${request.title}`,
    `Request description: ${request.description}`,
    `Task title: ${plan.title}`,
    `Task description: ${plan.description}`,
    "Reply with JSON only, shaped as { subtasks: [{ title, description, acceptanceCriteria: string[], files: string[], runsInParallel: boolean }] }.",
    "Set runsInParallel to true only when the subtask's files do not overlap with any other subtask.",
  ].join("\n");

const subtasksFrom = (parent: Task, plan: OrchestrationPlan, ids: () => string): Task[] =>
  plan.subtasks.map((subtask) => ({
    id: ids(),
    requestId: parent.requestId,
    parentTaskId: parent.id,
    title: subtask.title,
    description: subtask.description,
    status: "in_progress",
    assignedAgent: "develop",
    attempts: 0,
    lastFeedback: null,
    reviewReason: null,
  }));

export const orchestrateRequest =
  (deps: OrchestrationDependencies) =>
  async (command: OrchestrateRequest): Promise<Outcome<Task[]>> => {
    const tasks = await deps.tasks.list();
    const parent = tasks.find((task) => task.id === command.taskId);

    if (!parent) {
      return fail("Task not found");
    }

    if (parent.status !== "in_progress" || parent.parentTaskId !== null) {
      return fail("Only a request task in progress can be split");
    }

    if (tasks.some((task) => task.parentTaskId === parent.id)) {
      return fail("This request was already split");
    }

    const request = (await deps.requests.list()).find((candidate) => candidate.id === parent.requestId);

    if (!request) {
      return fail("Request not found");
    }

    const reply = await deps.llm.generateJson(planPrompt(request, parent));

    if (!reply.ok) {
      return fail(reply.reason);
    }

    const parsed = parseOrchestrationPlan(reply.json);

    if (!parsed.ok) {
      return fail(parsed.reason);
    }

    const subtasks = subtasksFrom(parent, parsed.plan, () => deps.ids.next());

    await deps.requests.saveWithTasks(request, subtasks);

    for (const subtask of subtasks) {
      await deps.events.append({
        taskId: subtask.id,
        from: "in_progress",
        to: "in_progress",
        actor: "system",
        reason: `Created from ${parent.id} by the orchestrator`,
      });
    }

    return succeed(subtasks);
  };
