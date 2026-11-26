import { workspaceLocationOf } from "@/domain/boards/board";
import type { Request } from "@/domain/requests/request";
import type { Task } from "@/domain/tasks/task";
import { parseOrchestrationPlan, type OrchestrationPlan } from "@/domain/agents/orchestration-plan";
import type { ApplicationDependencies, PromptDependencies } from "../shared/dependencies";
import type { PromptLibrary } from "@/ports/prompt-library";
import { fail, succeed, type Outcome } from "../shared/outcome";
import type { LlmClient } from "@/ports/llm-client";
import { countFailedAttempt } from "@/domain/tasks/count-failed-attempt";
import { creationReason } from "@/domain/tasks/previous-failures";
import { conflictReason } from "./record-transition";
import type { AgentActivityRecord } from "@/domain/agents/agent-activity";
import { streamedLlm } from "../agents/streamed-llm";
import { liveProgressOf, withLiveStatus } from "../agents/live-progress";
import { withAgentActivity } from "../agents/with-agent-activity";
import { taskTitleOf } from "../agents/task-title";
import { scaffoldProject, type ScaffoldDependencies } from "../projects/scaffold-project";
import { missingBoardReason } from "../boards/board-messages";
import type { BoardRepository } from "@/ports/board-repository";

export type OrchestrateRequest = {
  kind: "OrchestrateRequest";
  taskId: string;
};

export type OrchestrationDependencies = ApplicationDependencies &
  ScaffoldDependencies &
  PromptDependencies & { llm: LlmClient; boards: BoardRepository };

const planPrompt = (prompts: PromptLibrary, request: Request, plan: { title: string; description: string }): string =>
  prompts.render("orchestrator", {
    requestTitle: request.title,
    requestDescription: request.description,
    taskTitle: plan.title,
    taskDescription: plan.description,
  });

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
  const counted = countFailedAttempt(tasks, parent.id, reason, "mechanical");

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

const scaffoldProjectOf = async (deps: OrchestrationDependencies, request: Request): Promise<Outcome<string[]>> => {
  const board = (await deps.boards.list()).find((candidate) => candidate.id === request.boardId);

  return board ? scaffoldProject(deps)({ kind: "ScaffoldProject", rootPath: workspaceLocationOf(board) }) : fail(missingBoardReason);
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

    const scaffolded = await scaffoldProjectOf(deps, request);

    if (!scaffolded.ok) {
      return fail(scaffolded.reason);
    }

    const reply = await deps.llm.generateJson(planPrompt(deps.prompts, request, parent));

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
        reason: creationReason(parent.id),
      });
    }

    return succeed(subtasks);
  };

export const orchestrateRequest =
  (deps: OrchestrationDependencies) =>
  async (command: OrchestrateRequest): Promise<Outcome<Task[]>> => {
    const title = await taskTitleOf(deps.tasks, command.taskId, "a request");

    const working: AgentActivityRecord = { agent: "orchestrator", state: "working", message: `Splitting "${title}" into subtasks` };

    const report = liveProgressOf(deps, command.taskId, working, "Splitting");

    return withAgentActivity(
      deps.activity,
      working,
      { agent: "orchestrator", state: "idle", message: "Waiting for a request in Ready" },
      () =>
        withLiveStatus(deps.tasks, command.taskId, () =>
          splitRequest({ ...deps, llm: streamedLlm(deps.llm, report) })(command),
        ),
    );
  };
