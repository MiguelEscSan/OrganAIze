import { z } from "zod";
import type { FailureKind } from "@/domain/tasks/failure-kind";
import type { Task } from "@/domain/tasks/task";
import { runDeterministicChecks, type CheckFailure, type CheckedFile } from "@/domain/testing/deterministic-checks";
import type { BoardRepository } from "@/ports/board-repository";
import type { LlmClient } from "@/ports/llm-client";
import type { ProjectFiles } from "@/ports/project-files";
import type { ProjectTypeChecker, TypeFailure } from "@/ports/project-type-checker";
import type { WorkspaceReader } from "@/ports/workspace-reader";
import type { ApplicationDependencies } from "../shared/dependencies";
import { fail, succeed, type Outcome } from "../shared/outcome";
import { rootPathOfTask } from "../shared/task-workspace";
import { submitTestResult, type TestVerdict } from "../tasks/submit-test-result";
import type { AgentActivityRecord } from "@/domain/agents/agent-activity";
import { streamedLlm } from "../agents/streamed-llm";
import { liveProgressOf, withLiveStatus } from "../agents/live-progress";
import { withAgentActivity } from "../agents/with-agent-activity";

export type TypeCheckDependencies = {
  projectFiles: ProjectFiles;
  typeChecker: ProjectTypeChecker;
};

export type TestingDependencies = ApplicationDependencies &
  Partial<TypeCheckDependencies> & {
    llm: LlmClient;
    boards: BoardRepository;
    workspaceFor: (rootPath: string) => WorkspaceReader;
  };

const reviewFailureSchema = z.object({
  criterion: z.string(),
  file: z.string(),
  line: z.number().int().nullable(),
  message: z.string(),
});

const reviewSchema = z
  .object({ passed: z.boolean(), failures: z.array(reviewFailureSchema) })
  .refine((review) => (review.passed ? review.failures.length === 0 : review.failures.length > 0));

type ReviewFailure = z.infer<typeof reviewFailureSchema>;
type Review = z.infer<typeof reviewSchema>;

const numbered = (items: readonly string[]): string => items.map((item, index) => `${index + 1}. ${item}`).join("\n");

const locationOf = (file: string, line: number | null): string => (line === null ? file : `${file}:${line}`);

const checkFailureText = (failure: CheckFailure): string => `${locationOf(failure.file, failure.line)}: ${failure.message}`;

const typeFailureText = (failure: TypeFailure): string =>
  `Type check (${locationOf(failure.file, failure.line)}): ${failure.message}`;

const reviewFailureText = (failure: ReviewFailure): string =>
  `${failure.criterion} (${locationOf(failure.file, failure.line)}): ${failure.message}`;

const failedVerdict = (feedback: string, kind: FailureKind): TestVerdict => ({ passed: false, feedback, kind });

export const unreviewedVerdict = (reason: string): TestVerdict =>
  failedVerdict(numbered([`The review could not be completed: ${reason}`]), "mechanical");

const describeFile = (file: CheckedFile): string =>
  file.content === null ? `### ${file.path}\n(missing)` : `### ${file.path}\n${file.content}`;

const renderedPageSection = (renderedPage: string | undefined): string[] =>
  renderedPage === undefined ? [] : ["Visible text of the running app:", renderedPage];

const reviewPrompt = (task: Task, files: readonly CheckedFile[], renderedPage: string | undefined): string =>
  [
    `Review this subtask against its acceptance criteria and nothing else: ${task.title}`,
    "Acceptance criteria:",
    ...task.acceptanceCriteria.map((criterion) => `- ${criterion}`),
    "Current content of the files:",
    ...files.map(describeFile),
    ...renderedPageSection(renderedPage),
    'Reply with JSON only, in the form {"passed": boolean, "failures": [{"criterion": string, "file": string, "line": number | null, "message": string}]}.',
    "Use passed true with an empty failures list when every criterion holds.",
    "Use passed false with one failure per violated criterion, naming the file and line when possible.",
  ].join("\n\n");

const verdictOfReview = (review: Review): TestVerdict =>
  review.passed ? { passed: true } : failedVerdict(numbered(review.failures.map(reviewFailureText)), "substantive");

const reviewWithLlm = async (
  deps: TestingDependencies,
  task: Task,
  files: readonly CheckedFile[],
  renderedPage: string | undefined,
): Promise<TestVerdict> => {
  const reply = await deps.llm.generateJson(reviewPrompt(task, files, renderedPage));

  if (!reply.ok) {
    return unreviewedVerdict(reply.reason);
  }

  const parsed = reviewSchema.safeParse(reply.json);

  return parsed.success ? verdictOfReview(parsed.data) : unreviewedVerdict("the reply does not match the review format");
};

const readTaskFiles = async (reader: WorkspaceReader, task: Task): Promise<Outcome<CheckedFile[]>> => {
  try {
    return succeed(await Promise.all(task.files.map(async (path) => ({ path, content: await reader.read(path) }))));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "the files could not be read");
  }
};

const typeFailuresOfTask = async (deps: TestingDependencies, rootPath: string, task: Task): Promise<TypeFailure[]> => {
  if (!deps.projectFiles || !deps.typeChecker) {
    return [];
  }

  try {
    const projectFiles = await deps.projectFiles.list(rootPath);

    return await deps.typeChecker.check(projectFiles, task.files);
  } catch {
    return [];
  }
};

export const verdictForTask = async (
  deps: TestingDependencies,
  task: Task,
  renderedPage?: string,
): Promise<Outcome<TestVerdict>> => {
  const rootPath = await rootPathOfTask(deps, task);

  if (!rootPath.ok) {
    return fail(rootPath.reason);
  }

  const files = await readTaskFiles(deps.workspaceFor(rootPath.value), task);

  if (!files.ok) {
    return succeed(unreviewedVerdict(files.reason));
  }

  const checkFailures = runDeterministicChecks(files.value);

  if (checkFailures.length > 0) {
    return succeed(failedVerdict(numbered(checkFailures.map(checkFailureText)), "mechanical"));
  }

  const typeFailures = await typeFailuresOfTask(deps, rootPath.value, task);

  if (typeFailures.length > 0) {
    return succeed(failedVerdict(numbered(typeFailures.map(typeFailureText)), "mechanical"));
  }

  return succeed(await reviewWithLlm(deps, task, files.value, renderedPage));
};

export const submitVerdict = async (deps: TestingDependencies, task: Task, verdict: TestVerdict): Promise<void> => {
  await submitTestResult(deps)({ kind: "SubmitTestResult", taskId: task.id, verdict });
};

const judgeTask = async (deps: TestingDependencies, task: Task): Promise<void> => {
  const verdict = await verdictForTask(deps, task);

  await submitVerdict(deps, task, verdict.ok ? verdict.value : unreviewedVerdict(verdict.reason));
};

const reviewTask = (deps: TestingDependencies, task: Task): Promise<void> => {
  const working: AgentActivityRecord = { agent: "testing", state: "reviewing", message: `Reviewing "${task.title}"` };

  const report = liveProgressOf(deps, task.id, working, "Reviewing");

  return withAgentActivity(
    deps.activity,
    working,
    { agent: "testing", state: "idle", message: "Waiting for a subtask in QA" },
    () => withLiveStatus(deps.tasks, task.id, () => judgeTask({ ...deps, llm: streamedLlm(deps.llm, report) }, task)),
  );
};

export const runTesting =
  (deps: TestingDependencies) =>
  async (): Promise<void> => {
    const queued = (await deps.tasks.list()).filter((task) => task.status === "qa");

    for (const task of queued) {
      await reviewTask(deps, task);
    }
  };
