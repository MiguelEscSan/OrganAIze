import { checkFileScope } from "@/domain/agents/check-file-scope";
import { parseDevelopOutput, type DevelopFile } from "@/domain/agents/develop-output";
import { budgetOverrunReason, minutesBetween } from "@/domain/tasks/budget";
import { countFailedAttempt } from "@/domain/tasks/count-failed-attempt";
import type { Task } from "@/domain/tasks/task";
import type { BoardRepository } from "@/ports/board-repository";
import type { LlmClient, LlmReply } from "@/ports/llm-client";
import type { WorkspaceWriter } from "@/ports/workspace-writer";
import type { ApplicationDependencies } from "../shared/dependencies";
import { fail, succeed, type Outcome } from "../shared/outcome";
import { mergeSharedFile } from "./merge-shared-file";
import { workspaceOfTask } from "../shared/task-workspace";
import { qaFullReason } from "./qa-capacity";
import { conflictReason } from "./record-transition";
import { stopTaskForBudget } from "./stop-task-for-budget";
import type { AgentActivityRecord } from "@/domain/agents/agent-activity";
import { streamedActivityLlm } from "../agents/streamed-activity-llm";
import { withAgentActivity } from "../agents/with-agent-activity";
import { taskTitleOf } from "../agents/task-title";
import { submitDevelopResult } from "./submit-develop-result";

export type RunDevelop = { kind: "RunDevelop"; taskId: string };

export type DevelopDependencies = ApplicationDependencies & {
  llm: LlmClient;
  boards: BoardRepository;
  workspaceFor: (rootPath: string) => WorkspaceWriter;
};

type CurrentFile = { path: string; content: string | null };

const describeCurrentFile = (file: CurrentFile): string =>
  file.content === null ? `### ${file.path}\n(new file)` : `### ${file.path}\n${file.content}`;

const feedbackSection = (feedback: string | null): string[] =>
  feedback ? ["Feedback from the last review, fix every point:", feedback] : [];

const developPrompt = (task: Task, currentFiles: readonly CurrentFile[]): string =>
  [
    `Implement this subtask: ${task.title}`,
    task.description,
    "Acceptance criteria:",
    ...task.acceptanceCriteria.map((criterion) => `- ${criterion}`),
    ...feedbackSection(task.lastFeedback),
    `You may write only these files: ${task.files.join(", ")}`,
    "Current content of those files:",
    ...currentFiles.map(describeCurrentFile),
    "Any file that contains JSX must end in .tsx, never .ts.",
    'Reply with JSON only, in the form {"files":[{"path":"...","content":"full file content"}]}.',
    "Include the full content of every file you change. Do not write any other path.",
  ].join("\n\n");

const countFailure = async (
  deps: DevelopDependencies,
  tasks: readonly Task[],
  task: Task,
  reason: string,
): Promise<Outcome<Task>> => {
  const counted = countFailedAttempt(tasks, task.id, reason);

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

const reconcileFiles = async (
  deps: DevelopDependencies,
  workspace: WorkspaceWriter,
  baseFiles: readonly CurrentFile[],
  proposed: readonly DevelopFile[],
): Promise<Outcome<DevelopFile[]>> => {
  const reconciled: DevelopFile[] = [];

  for (const file of proposed) {
    const base = baseFiles.find((candidate) => candidate.path === file.path)?.content ?? null;
    const current = await workspace.read(file.path);

    if (current === base) {
      reconciled.push(file);
      continue;
    }

    const merged = await mergeSharedFile(deps.llm, { path: file.path, base, current: current ?? "", proposed: file.content });

    if (!merged.ok) {
      return fail(merged.reason);
    }

    reconciled.push({ path: file.path, content: merged.value });
  }

  return succeed(reconciled);
};

const readCurrentFiles = async (workspace: WorkspaceWriter, task: Task): Promise<CurrentFile[]> =>
  Promise.all(task.files.map(async (path) => ({ path, content: await workspace.read(path) })));

const tokensUsed = (reply: LlmReply): number => (reply.ok ? (reply.totalTokens ?? 0) : 0);

const writeSubtask =
  (deps: DevelopDependencies) =>
  async (command: RunDevelop): Promise<Outcome<Task>> => {
    const tasks = await deps.tasks.list();
    const task = tasks.find((candidate) => candidate.id === command.taskId);

    if (!task || task.status !== "in_progress" || task.assignedAgent !== "develop") {
      return fail("Only a develop subtask in progress can run");
    }

    const workspace = await workspaceOfTask(deps, task);

    if (!workspace.ok) {
      return fail(workspace.reason);
    }

    const startedAt = deps.clock.now();
    const currentFiles = await readCurrentFiles(workspace.value, task);
    const reply = await deps.llm.generateJson(developPrompt(task, currentFiles));
    const settings = await deps.settings.get();
    const overrun = budgetOverrunReason(
      { minutes: minutesBetween(startedAt, deps.clock.now()), tokens: tokensUsed(reply) },
      { maxMinutes: settings.maxMinutes, maxTokens: settings.maxTokens },
    );

    if (overrun) {
      return stopTaskForBudget(deps)({ kind: "StopTaskForBudget", taskId: task.id, reason: overrun });
    }

    if (!reply.ok) {
      return reply.unavailable ? fail(reply.reason) : countFailure(deps, tasks, task, reply.reason);
    }

    const parsed = parseDevelopOutput(reply.json);

    if (!parsed.ok) {
      return countFailure(deps, tasks, task, parsed.reason);
    }

    const scope = checkFileScope(parsed.output.files, task.files);

    if (!scope.ok) {
      return countFailure(deps, tasks, task, scope.reason);
    }

    const full = qaFullReason(await deps.tasks.list(), settings.maxQaTasks);

    if (full) {
      return fail(full);
    }

    const reconciled = await reconcileFiles(deps, workspace.value, currentFiles, parsed.output.files);

    if (!reconciled.ok) {
      return countFailure(deps, tasks, task, reconciled.reason);
    }

    await workspace.value.write(reconciled.value);

    return submitDevelopResult(deps)({ kind: "SubmitDevelopResult", taskId: task.id });
  };

export const runDevelop =
  (deps: DevelopDependencies) =>
  async (command: RunDevelop): Promise<Outcome<Task>> => {
    const title = await taskTitleOf(deps.tasks, command.taskId, "a subtask");

    const working: AgentActivityRecord = { agent: "develop", state: "working", message: `Writing "${title}"` };

    return withAgentActivity(
      deps.activity,
      working,
      { agent: "develop", state: "idle", message: "Waiting for a subtask in progress" },
      () => writeSubtask({ ...deps, llm: streamedActivityLlm(deps.llm, deps.activity, working) })(command),
    );
  };
