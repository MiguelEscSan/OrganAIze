import { z } from "zod";
import type { FailureKind } from "@/domain/tasks/failure-kind";
import type { Task } from "@/domain/tasks/task";
import { runDeterministicChecks, type CheckFailure, type CheckedFile } from "@/domain/testing/deterministic-checks";
import type { BoardRepository } from "@/ports/board-repository";
import type { LlmClient } from "@/ports/llm-client";
import type { ProjectFiles } from "@/ports/project-files";
import type { ProjectTypeChecker, TypeFailure } from "@/ports/project-type-checker";
import type { WorkspaceReader } from "@/ports/workspace-reader";
import type { PromptLibrary } from "@/ports/prompt-library";
import type { ApplicationDependencies, PromptDependencies } from "../shared/dependencies";
import { blocksOf, bulletsOf } from "../agents/prompt-blocks";
import { fail, succeed, type Outcome } from "../shared/outcome";
import { rootPathOfTask } from "../shared/task-workspace";
import { submitTestResult, type TestVerdict } from "../tasks/submit-test-result";
import type { AgentActivityRecord } from "@/domain/agents/agent-activity";
import { streamedLlm, type ProgressReport } from "../agents/streamed-llm";
import { liveStepsOf, noAnnouncement, withLiveStatus } from "../agents/live-progress";
import { describePaths } from "../agents/describe-paths";
import { withAgentActivity } from "../agents/with-agent-activity";

export type TypeCheckDependencies = {
  projectFiles: ProjectFiles;
  typeChecker: ProjectTypeChecker;
};

export type TestingDependencies = ApplicationDependencies &
  PromptDependencies &
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

const reviewPrompt = (
  prompts: PromptLibrary,
  task: Task,
  files: readonly CheckedFile[],
  renderedPage: string | undefined,
): string =>
  prompts.render("testing-subtask", {
    title: task.title,
    acceptanceCriteria: bulletsOf(task.acceptanceCriteria),
    files: blocksOf(files.map(describeFile)),
    renderedPage,
  });

const verdictOfReview = (review: Review): TestVerdict =>
  review.passed ? { passed: true } : failedVerdict(numbered(review.failures.map(reviewFailureText)), "substantive");

const reviewWithLlm = async (
  deps: TestingDependencies,
  task: Task,
  files: readonly CheckedFile[],
  renderedPage: string | undefined,
): Promise<TestVerdict> => {
  const reply = await deps.llm.generateJson(reviewPrompt(deps.prompts, task, files, renderedPage));

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

const typeFailuresOfTask = async (
  deps: TestingDependencies,
  rootPath: string,
  task: Task,
  announce: ProgressReport,
): Promise<TypeFailure[]> => {
  if (!deps.projectFiles || !deps.typeChecker) {
    return [];
  }

  await announce(`Type-checking ${describePaths(task.files)}`);

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
  announce: ProgressReport = noAnnouncement,
): Promise<Outcome<TestVerdict>> => {
  const rootPath = await rootPathOfTask(deps, task);

  if (!rootPath.ok) {
    return fail(rootPath.reason);
  }

  const paths = describePaths(task.files);

  await announce(`Reading ${paths}`);
  const files = await readTaskFiles(deps.workspaceFor(rootPath.value), task);

  if (!files.ok) {
    return succeed(unreviewedVerdict(files.reason));
  }

  await announce("Running file checks");
  const checkFailures = runDeterministicChecks(files.value);

  if (checkFailures.length > 0) {
    return succeed(failedVerdict(numbered(checkFailures.map(checkFailureText)), "mechanical"));
  }

  const typeFailures = await typeFailuresOfTask(deps, rootPath.value, task, announce);

  if (typeFailures.length > 0) {
    return succeed(failedVerdict(numbered(typeFailures.map(typeFailureText)), "mechanical"));
  }

  await announce(`Reviewing the criteria against ${paths}`);

  return succeed(await reviewWithLlm(deps, task, files.value, renderedPage));
};

export const submitVerdict = async (deps: TestingDependencies, task: Task, verdict: TestVerdict): Promise<void> => {
  await submitTestResult(deps)({ kind: "SubmitTestResult", taskId: task.id, verdict });
};

const judgeTask = async (deps: TestingDependencies, task: Task, announce: ProgressReport): Promise<void> => {
  const verdict = await verdictForTask(deps, task, undefined, announce);

  await submitVerdict(deps, task, verdict.ok ? verdict.value : unreviewedVerdict(verdict.reason));
};

const reviewTask = (deps: TestingDependencies, task: Task): Promise<void> => {
  const working: AgentActivityRecord = { agent: "testing", state: "reviewing", message: `Reviewing "${task.title}"` };

  const steps = liveStepsOf(deps, task.id, working);

  return withAgentActivity(
    deps,
    working,
    { agent: "testing", state: "idle", message: "Waiting for a subtask in QA" },
    () =>
      withLiveStatus(deps.tasks, task.id, () =>
        judgeTask({ ...deps, llm: streamedLlm(deps.llm, steps.streamed) }, task, steps.announce),
      ),
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
