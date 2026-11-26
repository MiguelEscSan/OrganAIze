import { z } from "zod";
import type { AgentActivityRecord } from "@/domain/agents/agent-activity";
import { selectContextFiles } from "@/domain/projects/select-context-files";
import { approveRequest } from "@/domain/tasks/approve-request";
import { rejectRequest, type RequestFailure } from "@/domain/tasks/reject-request";
import { requestReadyForQa } from "@/domain/tasks/request-ready-for-qa";
import { subtasksOf } from "@/domain/tasks/request-subtasks";
import type { Task } from "@/domain/tasks/task";
import type { TaskEvent } from "@/domain/tasks/task-event";
import type { InterfaceProbe } from "@/ports/interface-probe";
import type { LlmClient } from "@/ports/llm-client";
import type { ProjectFile } from "@/ports/project-files";
import { streamedLlm } from "../agents/streamed-llm";
import { liveProgressOf, withLiveStatus } from "../agents/live-progress";
import { withAgentActivity } from "../agents/with-agent-activity";
import { fail, succeed, type Outcome } from "../shared/outcome";
import { rootPathOfTask } from "../shared/task-workspace";
import { contextBudgetOf } from "../tasks/run-develop";
import { conflictReason } from "../tasks/record-transition";
import { renderedEvidence } from "./run-browser-check";
import type { TestingDependencies } from "./run-testing";

export type RequestQaExtras = {
  interfaceProbe?: InterfaceProbe;
  browserCheckEnabled?: () => boolean;
};

export type RequestQaDependencies = TestingDependencies & RequestQaExtras;

export type RunRequestQa = { kind: "RunRequestQa"; requestId: string };

export type RequestQaOutcome = "skipped" | "passed" | "failed";

type RequestVerdict = { passed: true } | { passed: false; failures: RequestFailure[] };

const reviewSchema = z
  .object({
    passed: z.boolean(),
    failures: z.array(z.object({ criterion: z.string(), file: z.string().nullable(), message: z.string() })),
  })
  .refine((review) => (review.passed ? review.failures.length === 0 : review.failures.length > 0));

const appStartCriterion = "The app starts";
const requestReviewCriterion = "Request review";

const failedVerdict = (criterion: string, message: string): RequestVerdict => ({
  passed: false,
  failures: [{ criterion, file: null, message }],
});

const unreviewedVerdict = (reason: string): RequestVerdict =>
  failedVerdict(requestReviewCriterion, `The review could not be completed: ${reason}`);

const describeSubtask = (subtask: Task): string =>
  [`- ${subtask.title} (files: ${subtask.files.join(", ")})`, ...subtask.acceptanceCriteria.map((criterion) => `  - ${criterion}`)].join(
    "\n",
  );

const describeContextFile = (file: ProjectFile): string => `### ${file.path}\n${file.content}`;

const contextSection = (files: readonly ProjectFile[]): string[] =>
  files.length === 0 ? [] : ["Project files (read-only context):", ...files.map(describeContextFile)];

const reviewPrompt = (
  request: Task,
  subtasks: readonly Task[],
  renderedPage: string,
  contextFiles: readonly ProjectFile[],
): string =>
  [
    `Review the running app as a whole against this request and nothing else: ${request.title}`,
    request.description,
    "Subtasks of the request and their acceptance criteria:",
    ...subtasks.map(describeSubtask),
    "Visible text of the running app:",
    renderedPage,
    ...contextSection(contextFiles),
    'Reply with JSON only, in the form {"passed": boolean, "failures": [{"criterion": string, "file": string | null, "message": string}]}.',
    "Use passed true with an empty failures list when the app fulfils the request and every acceptance criterion holds.",
    "Use passed false with one failure per violated criterion.",
    "In file put the exact project-relative path of the file responsible for the failure when you can tell, otherwise null.",
  ].join("\n\n");

const readContextFiles = async (deps: RequestQaDependencies, rootPath: string, llm: LlmClient): Promise<ProjectFile[]> => {
  if (!deps.projectFiles) {
    return [];
  }

  try {
    return selectContextFiles(await deps.projectFiles.list(rootPath), [], contextBudgetOf(llm));
  } catch {
    return [];
  }
};

const reviewRenderedApp = async (
  deps: RequestQaDependencies,
  llm: LlmClient,
  request: Task,
  subtasks: readonly Task[],
  rootPath: string,
  renderedPage: string,
): Promise<RequestVerdict> => {
  const contextFiles = await readContextFiles(deps, rootPath, llm);
  const reply = await llm.generateJson(reviewPrompt(request, subtasks, renderedPage, contextFiles));

  if (!reply.ok) {
    return unreviewedVerdict(reply.reason);
  }

  const parsed = reviewSchema.safeParse(reply.json);

  if (!parsed.success) {
    return unreviewedVerdict("the reply does not match the review format");
  }

  return parsed.data.passed ? { passed: true } : { passed: false, failures: parsed.data.failures };
};

const verdictOfRunningApp = async (
  deps: RequestQaDependencies,
  llm: LlmClient,
  request: Task,
  subtasks: readonly Task[],
): Promise<RequestVerdict> => {
  const rootPath = await rootPathOfTask(deps, request);

  if (!rootPath.ok) {
    return unreviewedVerdict(rootPath.reason);
  }

  if (!deps.interfaceProbe) {
    return failedVerdict(appStartCriterion, "the interface probe is not available");
  }

  const probe = await deps.interfaceProbe.inspect(rootPath.value);

  if (!probe.ok) {
    return failedVerdict(appStartCriterion, probe.reason);
  }

  return reviewRenderedApp(deps, llm, request, subtasks, rootPath.value, renderedEvidence(probe.pageText, probe.consoleErrors));
};

const verdictOf = async (
  deps: RequestQaDependencies,
  llm: LlmClient,
  request: Task,
  subtasks: readonly Task[],
): Promise<RequestVerdict> => {
  if (!(deps.browserCheckEnabled?.() ?? false)) {
    return { passed: true };
  }

  try {
    return await verdictOfRunningApp(deps, llm, request, subtasks);
  } catch (error) {
    return unreviewedVerdict(error instanceof Error ? error.message : "the request could not be reviewed");
  }
};

const judgeRequest = (deps: RequestQaDependencies, request: Task, subtasks: readonly Task[]): Promise<RequestVerdict> => {
  const working: AgentActivityRecord = { agent: "testing", state: "reviewing", message: `Reviewing request "${request.title}"` };
  const report = liveProgressOf(deps, request.id, working, "Reviewing");

  return withAgentActivity(
    deps.activity,
    working,
    { agent: "testing", state: "idle", message: "Waiting for a subtask in QA" },
    () => withLiveStatus(deps.tasks, request.id, () => verdictOf(deps, streamedLlm(deps.llm, report), request, subtasks)),
  );
};

const persist = async (
  deps: RequestQaDependencies,
  after: readonly Task[],
  events: readonly TaskEvent[],
): Promise<Outcome<null>> => {
  for (const event of events) {
    const task = after.find((candidate) => candidate.id === event.taskId);
    const outcome = task ? await deps.tasks.applyTransition({ task, expectedStatus: event.from, event }) : "conflict";

    if (outcome !== "applied") {
      return fail(conflictReason);
    }
  }

  return succeed(null);
};

const settle = async (deps: RequestQaDependencies, requestId: string, verdict: RequestVerdict): Promise<Outcome<RequestQaOutcome>> => {
  const tasks = await deps.tasks.list();
  const settings = await deps.settings.get();
  const result = verdict.passed
    ? approveRequest(tasks, requestId)
    : rejectRequest(tasks, requestId, verdict.failures, settings.maxAttempts);

  if (!result.ok) {
    return fail(result.reason);
  }

  const persisted = await persist(deps, result.tasks, result.events);

  return persisted.ok ? succeed(verdict.passed ? "passed" : "failed") : fail(persisted.reason);
};

export const runRequestQa =
  (deps: RequestQaDependencies) =>
  async (command: RunRequestQa): Promise<Outcome<RequestQaOutcome>> => {
    const tasks = await deps.tasks.list();
    const ready = requestReadyForQa(tasks, command.requestId);

    if (!ready.ok) {
      return succeed("skipped");
    }

    const entered = await persist(deps, ready.tasks, [ready.event]);

    if (!entered.ok) {
      return fail(entered.reason);
    }

    const request = ready.tasks.find((task) => task.id === command.requestId);

    if (!request) {
      return fail("Task not found");
    }

    const verdict = await judgeRequest(deps, request, subtasksOf(ready.tasks, command.requestId));

    return settle(deps, command.requestId, verdict);
  };
