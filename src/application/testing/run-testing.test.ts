import { describe, expect, it, vi } from "vitest";
import type { LlmClient, LlmReply } from "@/ports/llm-client";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import { createScriptedLlmClient } from "@/adapters/in-memory/in-memory-llm-client";
import { buildTask } from "@/adapters/in-memory/task-fixtures";
import { createInMemoryWorkspaceReader } from "@/adapters/in-memory/in-memory-workspace-reader";
import { createInMemoryBoardRepository } from "@/adapters/in-memory/in-memory-board-repository";
import { developSeed, inMemoryWorkspaceDependencies } from "@/adapters/in-memory/in-memory-workspace-dependencies";
import type { Task } from "@/domain/tasks/task";
import { runTesting } from "./run-testing";

const cardPath = "src/app/card.tsx";
const validCard = "export const Card = () => <section>Title</section>;";
const unclosedCard = ["export const Card = () => (", "  <section>", "    <p>hello</p>", ");"].join("\n");
const passingReview: LlmReply = { ok: true, json: { passed: true, failures: [] } };

const qaTask = (overrides: Partial<Task> = {}): Task =>
  buildTask({
    id: "subtask-1",
    requestId: "request-1",
    parentTaskId: "parent-1",
    status: "qa",
    assignedAgent: "develop",
    files: [cardPath],
    acceptanceCriteria: ["Card shows the title"],
    ...overrides,
  });

const setup = (tasks: Task[], files: Record<string, string>, llm: LlmClient) => {
  const deps = createInMemoryDependencies({ ...developSeed, tasks });
  const reader = createInMemoryWorkspaceReader(files);
  const testing = runTesting({ ...deps, ...inMemoryWorkspaceDependencies(reader), llm });

  return { deps, testing };
};

const taskById = async (deps: ReturnType<typeof createInMemoryDependencies>, taskId: string) =>
  (await deps.tasks.list()).find((task) => task.id === taskId);

const reviewingLlm = (reply: LlmReply) => ({
  generateJson: vi.fn<(prompt: string) => Promise<LlmReply>>(async () => reply),
});

describe("runTesting", () => {
  it("sends a task with a missing file back to in progress with a numbered item naming the file", async () => {
    const llm = reviewingLlm(passingReview);
    const { deps, testing } = setup([qaTask()], {}, llm);

    await testing();

    const task = await taskById(deps, "subtask-1");
    expect([task?.status, task?.attempts]).toEqual(["in_progress", 1]);
    expect(task?.lastFeedback).toContain(`1. ${cardPath}: File ${cardPath} does not exist`);
    expect(llm.generateJson).not.toHaveBeenCalled();
  });

  it("sends a task back to in progress with the reason when its board cannot be found", async () => {
    const deps = createInMemoryDependencies({ ...developSeed, tasks: [qaTask()] });
    const testing = runTesting({
      ...deps,
      ...inMemoryWorkspaceDependencies(createInMemoryWorkspaceReader({ [cardPath]: validCard })),
      boards: createInMemoryBoardRepository([]),
      llm: reviewingLlm(passingReview),
    });

    await testing();

    const task = await taskById(deps, "subtask-1");
    expect([task?.status, task?.attempts]).toEqual(["in_progress", 1]);
    expect(task?.lastFeedback).toContain("The board for this task was not found");
  });

  it("sends a task with a tsx syntax error back to in progress with the file and line", async () => {
    const { deps, testing } = setup([qaTask()], { [cardPath]: unclosedCard }, reviewingLlm(passingReview));

    await testing();

    const task = await taskById(deps, "subtask-1");
    expect([task?.status, task?.attempts]).toEqual(["in_progress", 1]);
    expect(task?.lastFeedback).toContain(`1. ${cardPath}:2: Syntax error`);
  });

  it("moves a task that passes the checks and the review to deploy", async () => {
    const { deps, testing } = setup([qaTask()], { [cardPath]: validCard }, reviewingLlm(passingReview));

    await testing();

    const task = await taskById(deps, "subtask-1");
    expect([task?.status, task?.attempts]).toEqual(["deploy", 0]);
  });

  it("sends a task that fails the review back to in progress with the failures as numbered feedback", async () => {
    const failingReview: LlmReply = {
      ok: true,
      json: {
        passed: false,
        failures: [
          { criterion: "Card shows the title", file: cardPath, line: 1, message: "The title text is missing" },
        ],
      },
    };
    const { deps, testing } = setup([qaTask()], { [cardPath]: validCard }, reviewingLlm(failingReview));

    await testing();

    const task = await taskById(deps, "subtask-1");
    expect([task?.status, task?.attempts]).toEqual(["in_progress", 1]);
    expect(task?.lastFeedback).toBe(
      `1. Card shows the title (${cardPath}:1): The title text is missing`,
    );
  });

  it.each([
    ["an invalid reply", { ok: true, json: { passed: "yes" } } as LlmReply],
    ["a failed call", { ok: false, reason: "Gemini is unavailable" } as LlmReply],
    [
      "a pass that lists failures",
      { ok: true, json: { passed: true, failures: [{ criterion: "Card shows the title", file: cardPath, line: null, message: "x" }] } } as LlmReply,
    ],
  ])("counts %s as a failed attempt, never as a pass", async (_label, reply) => {
    const { deps, testing } = setup([qaTask()], { [cardPath]: validCard }, reviewingLlm(reply));

    await testing();

    const task = await taskById(deps, "subtask-1");
    expect([task?.status, task?.attempts]).toEqual(["in_progress", 1]);
    expect(task?.lastFeedback).toContain("could not be completed");
  });

  it("gives the review the acceptance criteria and the file contents", async () => {
    const llm = reviewingLlm(passingReview);
    const { testing } = setup([qaTask()], { [cardPath]: validCard }, llm);

    await testing();

    const prompt = String(llm.generateJson.mock.calls[0]?.[0]);
    expect(prompt).toContain("Card shows the title");
    expect(prompt).toContain(validCard);
  });

  it("reviews every task in qa", async () => {
    const second = qaTask({ id: "subtask-2", files: ["src/app/other.tsx"] });
    const { deps, testing } = setup(
      [qaTask(), second],
      { [cardPath]: validCard, "src/app/other.tsx": validCard },
      createScriptedLlmClient(passingReview),
    );

    await testing();

    expect((await taskById(deps, "subtask-1"))?.status).toBe("deploy");
    expect((await taskById(deps, "subtask-2"))?.status).toBe("deploy");
  });
});
