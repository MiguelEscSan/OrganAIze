import { describe, expect, it, vi } from "vitest";
import type { LlmReply } from "@/ports/llm-client";
import type { InterfaceProbeResult } from "@/ports/interface-probe";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import { buildTask } from "@/adapters/in-memory/task-fixtures";
import { createInMemoryWorkspaceReader } from "@/adapters/in-memory/in-memory-workspace-reader";
import { createInMemoryWorkspaceWriter } from "@/adapters/in-memory/in-memory-workspace-writer";
import { createInMemoryProjectFiles } from "@/adapters/in-memory/in-memory-project-files";
import { developSeed, inMemoryWorkspaceDependencies } from "@/adapters/in-memory/in-memory-workspace-dependencies";
import type { Task } from "@/domain/tasks/task";
import { runRequestQa } from "./run-request-qa";

const headerPath = "src/header.tsx";
const listPath = "src/list.tsx";
const passingReview: LlmReply = { ok: true, json: { passed: true, failures: [] } };
const goodProbe: InterfaceProbeResult = { ok: true, pageText: "Weekly schedule", consoleErrors: ["Hydration warning"] };

const requestTask = (overrides: Partial<Task> = {}): Task =>
  buildTask({
    id: "request",
    requestId: "request-1",
    status: "in_progress",
    title: "Schedule app",
    description: "A weekly schedule with a header and a list",
    ...overrides,
  });

const subtask = (id: string, file: string, overrides: Partial<Task> = {}): Task =>
  buildTask({
    id,
    requestId: "request-1",
    parentTaskId: "request",
    status: "awaiting_release",
    assignedAgent: "develop",
    title: `Subtask ${id}`,
    files: [file],
    acceptanceCriteria: [`${id} criterion`],
    ...overrides,
  });

const waitingTasks = (): Task[] => [requestTask(), subtask("a", headerPath), subtask("b", listPath)];

type Scenario = {
  tasks?: Task[];
  browserEnabled?: boolean;
  probeResult?: InterfaceProbeResult;
  review?: LlmReply;
};

const setup = ({ tasks = waitingTasks(), browserEnabled = true, probeResult = goodProbe, review = passingReview }: Scenario = {}) => {
  const deps = createInMemoryDependencies({ ...developSeed, tasks });
  const files = { [headerPath]: "export const Header = () => <h1>Weekly</h1>;", [listPath]: "export const List = () => <ul />;" };
  const workspace = createInMemoryWorkspaceWriter(files);
  const probe = { inspect: vi.fn(async () => probeResult) };
  const llm = { generateJson: vi.fn<(prompt: string) => Promise<LlmReply>>(async () => review) };
  const qa = runRequestQa({
    ...deps,
    ...inMemoryWorkspaceDependencies(createInMemoryWorkspaceReader(files)),
    projectFiles: createInMemoryProjectFiles(workspace),
    llm,
    interfaceProbe: probe,
    browserCheckEnabled: () => browserEnabled,
  });

  return { deps, qa, probe, llm };
};

const command = { kind: "RunRequestQa", requestId: "request" } as const;

const statusesOf = async (deps: ReturnType<typeof createInMemoryDependencies>) =>
  Object.fromEntries((await deps.tasks.list()).map((task) => [task.id, task.status]));

const taskById = async (deps: ReturnType<typeof createInMemoryDependencies>, id: string) =>
  (await deps.tasks.list()).find((task) => task.id === id);

const failingReview = (failures: { criterion: string; file: string | null; message: string }[]): LlmReply => ({
  ok: true,
  json: { passed: false, failures },
});

describe("runRequestQa", () => {
  it("does nothing while a subtask is still in qa or in progress", async () => {
    const tasks = [requestTask(), subtask("a", headerPath), subtask("b", listPath, { status: "qa" })];
    const { deps, qa, probe } = setup({ tasks });

    const outcome = await qa(command);

    expect(outcome).toEqual({ ok: true, value: "skipped" });
    expect(await statusesOf(deps)).toEqual({ request: "in_progress", a: "awaiting_release", b: "qa" });
    expect(probe.inspect).not.toHaveBeenCalled();
    expect(await deps.events.list()).toEqual([]);
  });

  it("passes without launching anything when the browser check is disabled", async () => {
    const { deps, qa, probe, llm } = setup({ browserEnabled: false });

    const outcome = await qa(command);

    expect(outcome).toEqual({ ok: true, value: "passed" });
    expect(probe.inspect).not.toHaveBeenCalled();
    expect(llm.generateJson).not.toHaveBeenCalled();
    expect(await statusesOf(deps)).toEqual({ request: "deploy", a: "deploy", b: "deploy" });
    const events = await deps.events.list();
    expect(events.map((event) => [event.taskId, event.from, event.to])).toEqual([
      ["request", "in_progress", "qa"],
      ["request", "qa", "deploy"],
      ["a", "awaiting_release", "deploy"],
      ["b", "awaiting_release", "deploy"],
    ]);
  });

  it("moves the request through qa and releases everything when the review passes", async () => {
    const { deps, qa, probe } = setup();

    const outcome = await qa(command);

    expect(outcome).toEqual({ ok: true, value: "passed" });
    expect(probe.inspect).toHaveBeenCalledWith("C:/projects/sample");
    expect(await statusesOf(deps)).toEqual({ request: "deploy", a: "deploy", b: "deploy" });
  });

  it("gives the review the request, every acceptance criterion, the rendered page and the console errors", async () => {
    const { qa, llm } = setup();

    await qa(command);

    const prompt = String(llm.generateJson.mock.calls[0]?.[0]);
    expect(prompt).toContain("A weekly schedule with a header and a list");
    expect(prompt).toContain("Subtask a");
    expect(prompt).toContain("a criterion");
    expect(prompt).toContain("b criterion");
    expect(prompt).toContain("Weekly schedule");
    expect(prompt).toContain("Hydration warning");
    expect(prompt).toContain("exact project-relative path");
    expect(prompt).toContain("export const Header");
  });

  it("returns only the subtask that declares the failing file", async () => {
    const review = failingReview([{ criterion: "Header shows the title", file: headerPath, message: "Title missing" }]);
    const { deps, qa } = setup({ review });

    const outcome = await qa(command);

    expect(outcome).toEqual({ ok: true, value: "failed" });
    expect(await statusesOf(deps)).toEqual({ request: "in_progress", a: "in_progress", b: "awaiting_release" });
    expect(await taskById(deps, "a")).toMatchObject({
      attempts: 1,
      lastFeedback: `1. Header shows the title (${headerPath}): Title missing`,
    });
    expect(await taskById(deps, "b")).toMatchObject({ attempts: 0, lastFeedback: null });
  });

  it("returns every subtask when the failure names no file", async () => {
    const review = failingReview([{ criterion: "The page renders", file: null, message: "The page is blank" }]);
    const { deps, qa } = setup({ review });

    await qa(command);

    expect(await statusesOf(deps)).toEqual({ request: "in_progress", a: "in_progress", b: "in_progress" });
    expect(await taskById(deps, "b")).toMatchObject({ attempts: 1, lastFeedback: "1. The page renders: The page is blank" });
  });

  it("returns every subtask with the reason when the app cannot start and skips the review", async () => {
    const { deps, qa, llm } = setup({ probeResult: { ok: false, reason: "the dev server did not answer" } });

    await qa(command);

    expect(await statusesOf(deps)).toEqual({ request: "in_progress", a: "in_progress", b: "in_progress" });
    expect(await taskById(deps, "a")).toMatchObject({
      lastFeedback: "1. The app starts: the dev server did not answer",
    });
    expect(llm.generateJson).not.toHaveBeenCalled();
  });

  it.each([
    ["an unavailable review", { ok: false, reason: "Gemini is unavailable" } as LlmReply],
    ["an invalid reply", { ok: true, json: { verdict: "fine" } } as LlmReply],
    [
      "a pass that lists failures",
      { ok: true, json: { passed: true, failures: [{ criterion: "x", file: null, message: "y" }] } } as LlmReply,
    ],
    ["a fail without failures", { ok: true, json: { passed: false, failures: [] } } as LlmReply],
  ])("counts %s as a failure, never as a pass", async (_label, review) => {
    const { deps, qa } = setup({ review });

    await qa(command);

    expect(await statusesOf(deps)).toEqual({ request: "in_progress", a: "in_progress", b: "in_progress" });
    expect((await taskById(deps, "a"))?.lastFeedback).toContain("Request review");
  });

  it("sends a returned subtask at its attempt limit to review", async () => {
    const tasks = [requestTask(), subtask("a", headerPath, { attempts: 2 }), subtask("b", listPath)];
    const review = failingReview([{ criterion: "Header shows the title", file: headerPath, message: "Title missing" }]);
    const { deps, qa } = setup({ tasks, review });

    await qa(command);

    expect(await taskById(deps, "a")).toMatchObject({ status: "review", attempts: 3, reviewReason: "attempts" });
    expect(await statusesOf(deps)).toMatchObject({ request: "in_progress", b: "awaiting_release" });
  });

  it("reports the testing agent as working while it runs and idle afterwards", async () => {
    const { deps, qa, llm } = setup();
    const seenWhileRunning: string[] = [];
    llm.generateJson.mockImplementation(async () => {
      seenWhileRunning.push(...(await deps.activity.list()).map((entry) => `${entry.agent}:${entry.state}`));
      return passingReview;
    });

    await qa(command);

    expect(seenWhileRunning).toContain("testing:reviewing");
    expect((await deps.activity.list()).find((entry) => entry.agent === "testing")?.state).toBe("idle");
  });

  it("does nothing for an unknown request", async () => {
    const { qa } = setup();

    const outcome = await qa({ kind: "RunRequestQa", requestId: "missing" });

    expect(outcome).toEqual({ ok: true, value: "skipped" });
  });
});
