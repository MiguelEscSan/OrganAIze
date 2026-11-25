import type { Request } from "@/domain/requests/request";
import type { Task } from "@/domain/tasks/task";
import { parseOrchestrationPlan, type OrchestrationPlan } from "@/domain/agents/orchestration-plan";
import type { ApplicationDependencies } from "../shared/dependencies";
import { fail, succeed, type Outcome } from "../shared/outcome";
import type { LlmClient } from "@/ports/llm-client";
import { countFailedAttempt } from "@/domain/tasks/count-failed-attempt";
import { conflictReason } from "./record-transition";
import { withAgentActivity } from "../agents/with-agent-activity";
import { taskTitleOf } from "../agents/task-title";

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
    "The project is a React app. App.tsx at the project root is the entry of the app: the first subtask creates it when it does not exist yet.",
    "Every later file grows from App.tsx as in a normal app: a subtask creates a component or module in its own file, and the subtask that uses it adds the import to App.tsx or to a file that App.tsx imports.",
    "Keep subtasks in parallel only when their files do not overlap; the subtask that wires new files into App.tsx must run in sequence.",
  ].join("\n");

const subtasksFrom = (parent: Task, plan: OrchestrationPlan, ids: () => string): Task[] =>
  plan.subtasks.map((subtask) => ({
    id: ids(),
    requestId: parent.requestId,
    parentTaskId: parent.id,
    title: subtask.title,
    description: subtask.description,
    acceptanceCriteria: subtask.acceptanceCriteria,
    files: subtask.files,
    status: "in_progress",
    assignedAgent: "develop",
    attempts: 0,
    lastFeedback: null,
    reviewReason: null,
    runsInParallel: subtask.runsInParallel,
  }));

const countInvalidPlan = async (
  deps: OrchestrationDependencies,
  tasks: readonly Task[],
  parent: Task,
  reason: string,
): Promise<Outcome<Task[]>> => {
  const counted = countFailedAttempt(tasks, parent.id, reason);

  if (!counted.ok) {
    return fail(counted.reason);
  }

  const outcome = await deps.tasks.applyTransition({
    task: counted.task,
    expectedStatus: "in_progress",
    event: counted.event,
  });

  return outcome === "applied" ? fail(reason) : fail(conflictReason);
};

const splitRequest =
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
      return countInvalidPlan(deps, tasks, parent, parsed.reason);
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

export const orchestrateRequest =
  (deps: OrchestrationDependencies) =>
  async (command: OrchestrateRequest): Promise<Outcome<Task[]>> => {
    const title = await taskTitleOf(deps.tasks, command.taskId, "a request");

    return withAgentActivity(
      deps.activity,
      { agent: "orchestrator", state: "working", message: `Splitting "${title}" into subtasks` },
      { agent: "orchestrator", state: "idle", message: "Waiting for a request in Ready" },
      () => splitRequest(deps)(command),
    );
  };
