import { z } from "zod";
import type { Task } from "@/domain/tasks/task";
import { runDeterministicChecks, type CheckFailure, type CheckedFile } from "@/domain/testing/deterministic-checks";
import type { BoardRepository } from "@/ports/board-repository";
import type { LlmClient } from "@/ports/llm-client";
import type { WorkspaceReader } from "@/ports/workspace-reader";
import type { ApplicationDependencies } from "../shared/dependencies";
import { fail, succeed, type Outcome } from "../shared/outcome";
import { workspaceOfTask } from "../shared/task-workspace";
import { submitTestResult, type TestVerdict } from "../tasks/submit-test-result";

export type TestingDependencies = ApplicationDependencies & {
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

const reviewFailureText = (failure: ReviewFailure): string =>
  `${failure.criterion} (${locationOf(failure.file, failure.line)}): ${failure.message}`;

const failedVerdict = (feedback: string): TestVerdict => ({ passed: false, feedback });

const unreviewedVerdict = (reason: string): TestVerdict =>
  failedVerdict(numbered([`The review could not be completed: ${reason}`]));

const describeFile = (file: CheckedFile): string =>
  file.content === null ? `### ${file.path}\n(missing)` : `### ${file.path}\n${file.content}`;

const reviewPrompt = (task: Task, files: readonly CheckedFile[]): string =>
  [
    `Review this subtask against its acceptance criteria and nothing else: ${task.title}`,
    "Acceptance criteria:",
    ...task.acceptanceCriteria.map((criterion) => `- ${criterion}`),
    "Current content of the files:",
    ...files.map(describeFile),
    'Reply with JSON only, in the form {"passed": boolean, "failures": [{"criterion": string, "file": string, "line": number | null, "message": string}]}.',
    "Use passed true with an empty failures list when every criterion holds.",
    "Use passed false with one failure per violated criterion, naming the file and line when possible.",
  ].join("\n\n");

const verdictOfReview = (review: Review): TestVerdict =>
  review.passed ? { passed: true } : failedVerdict(numbered(review.failures.map(reviewFailureText)));

const reviewWithLlm = async (deps: TestingDependencies, task: Task, files: readonly CheckedFile[]): Promise<TestVerdict> => {
  const reply = await deps.llm.generateJson(reviewPrompt(task, files));

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

const verdictFor = async (deps: TestingDependencies, task: Task): Promise<Outcome<TestVerdict>> => {
  const workspace = await workspaceOfTask(deps, task);

  if (!workspace.ok) {
    return fail(workspace.reason);
  }

  const files = await readTaskFiles(workspace.value, task);

  if (!files.ok) {
    return succeed(unreviewedVerdict(files.reason));
  }

  const checkFailures = runDeterministicChecks(files.value);

  if (checkFailures.length > 0) {
    return succeed(failedVerdict(numbered(checkFailures.map(checkFailureText))));
  }

  return succeed(await reviewWithLlm(deps, task, files.value));
};

const reviewTask = async (deps: TestingDependencies, task: Task): Promise<void> => {
  const verdict = await verdictFor(deps, task);

  if (!verdict.ok) {
    return;
  }

  await submitTestResult(deps)({ kind: "SubmitTestResult", taskId: task.id, verdict: verdict.value });
};

export const runTesting =
  (deps: TestingDependencies) =>
  async (): Promise<void> => {
    const queued = (await deps.tasks.list()).filter((task) => task.status === "qa");

    for (const task of queued) {
      await reviewTask(deps, task);
    }
  };
