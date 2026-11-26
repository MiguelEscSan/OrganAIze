import { describe, expect, it, vi } from "vitest";
import type { LlmClient, LlmReply } from "@/ports/llm-client";
import type { InterfaceProbe, InterfaceProbeResult } from "@/ports/interface-probe";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import { buildTask } from "@/adapters/in-memory/task-fixtures";
import { createInMemoryWorkspaceReader } from "@/adapters/in-memory/in-memory-workspace-reader";
import { developSeed, inMemoryWorkspaceDependencies } from "@/adapters/in-memory/in-memory-workspace-dependencies";
import type { Task } from "@/domain/tasks/task";
import { runBrowserCheck } from "./run-browser-check";

const pagePath = "src/app/page.tsx";
const validPage = "export default function Page() { return <h1>Schedule</h1>; }";
const passingReview: LlmReply = { ok: true, json: { passed: true, failures: [] } };
const renderedText = "Schedule";

const qaTask = (overrides: Partial<Task> = {}): Task =>
  buildTask({
    id: "subtask-1",
    requestId: "request-1",
    parentTaskId: "parent-1",
    status: "qa",
    assignedAgent: "develop",
    files: [pagePath],
    acceptanceCriteria: ["The page shows the title Schedule"],
    ...overrides,
  });

const probeReturning = (result: InterfaceProbeResult): InterfaceProbe & { inspect: ReturnType<typeof vi.fn> } => ({
  inspect: vi.fn(async () => result),
});

const reviewingLlm = (reply: LlmReply) => ({
  generateJson: vi.fn<(prompt: string) => Promise<LlmReply>>(async () => reply),
});

const setup = (tasks: Task[], probe: InterfaceProbe, llm: LlmClient) => {
  const deps = createInMemoryDependencies({ ...developSeed, tasks });
  const reader = createInMemoryWorkspaceReader({ [pagePath]: validPage });
  const check = runBrowserCheck({
    ...deps,
    ...inMemoryWorkspaceDependencies(reader),
    llm,
    interfaceProbe: probe,
  });

  return { deps, check };
};

const taskById = async (deps: ReturnType<typeof createInMemoryDependencies>, taskId: string) =>
  (await deps.tasks.list()).find((task) => task.id === taskId);

describe("runBrowserCheck", () => {
  it("refuses to run without confirmation and never starts the app", async () => {
    const probe = probeReturning({ ok: true, pageText: renderedText, consoleErrors: [] });
    const { deps, check } = setup([qaTask()], probe, reviewingLlm(passingReview));

    const outcome = await check({ kind: "RunBrowserCheck", taskId: "subtask-1", confirmed: false });

    expect(outcome.ok).toBe(false);
    expect(probe.inspect).not.toHaveBeenCalled();
    expect((await taskById(deps, "subtask-1"))?.status).toBe("qa");
  });

  it("refuses a task that is not waiting in qa", async () => {
    const probe = probeReturning({ ok: true, pageText: renderedText, consoleErrors: [] });
    const { check } = setup([qaTask({ status: "in_progress" })], probe, reviewingLlm(passingReview));

    const outcome = await check({ kind: "RunBrowserCheck", taskId: "subtask-1", confirmed: true });

    expect(outcome.ok).toBe(false);
    expect(probe.inspect).not.toHaveBeenCalled();
  });

  it("sends the rendered page text to the review and moves a passing task to awaiting release", async () => {
    const probe = probeReturning({ ok: true, pageText: renderedText, consoleErrors: [] });
    const llm = reviewingLlm(passingReview);
    const { deps, check } = setup([qaTask()], probe, llm);

    await check({ kind: "RunBrowserCheck", taskId: "subtask-1", confirmed: true });

    expect(probe.inspect).toHaveBeenCalledTimes(1);
    expect(llm.generateJson.mock.calls[0]?.[0]).toContain(renderedText);
    expect((await taskById(deps, "subtask-1"))?.status).toBe("awaiting_release");
  });

  it("sends a task whose page fails the review back to in progress with the failures", async () => {
    const failingReview: LlmReply = {
      ok: true,
      json: {
        passed: false,
        failures: [{ criterion: "The page shows the title Schedule", file: pagePath, line: 1, message: "Title missing" }],
      },
    };
    const probe = probeReturning({ ok: true, pageText: "Empty", consoleErrors: [] });
    const { deps, check } = setup([qaTask()], probe, reviewingLlm(failingReview));

    await check({ kind: "RunBrowserCheck", taskId: "subtask-1", confirmed: true });

    const task = await taskById(deps, "subtask-1");
    expect([task?.status, task?.attempts]).toEqual(["in_progress", 1]);
    expect(task?.lastFeedback).toContain(`1. The page shows the title Schedule (${pagePath}:1): Title missing`);
  });

  it("counts an app that cannot be started as a failed attempt with the reason", async () => {
    const probe = probeReturning({ ok: false, reason: "the dev server exited before it was reachable" });
    const llm = reviewingLlm(passingReview);
    const { deps, check } = setup([qaTask()], probe, llm);

    await check({ kind: "RunBrowserCheck", taskId: "subtask-1", confirmed: true });

    const task = await taskById(deps, "subtask-1");
    expect([task?.status, task?.attempts]).toEqual(["in_progress", 1]);
    expect(task?.lastFeedback).toContain("the dev server exited before it was reachable");
    expect(llm.generateJson).not.toHaveBeenCalled();
  });
});
