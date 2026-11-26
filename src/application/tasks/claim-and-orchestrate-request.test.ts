import { describe, expect, it } from "vitest";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import { createScriptedLlmClient } from "@/adapters/in-memory/in-memory-llm-client";
import { createInMemoryWorkspaceWriter } from "@/adapters/in-memory/in-memory-workspace-writer";
import { developSeed, inMemoryScaffoldDependencies } from "@/adapters/in-memory/in-memory-workspace-dependencies";
import type { Request } from "@/domain/requests/request";
import type { Task } from "@/domain/tasks/task";
import type { LlmClient, LlmReply } from "@/ports/llm-client";
import { claimAndOrchestrateRequest } from "./claim-and-orchestrate-request";

const request: Request = { id: "request-1", boardId: "board-1", title: "Landing", description: "A landing page" };
const readyTask: Task = {
  id: "task-1",
  requestId: "request-1",
  parentTaskId: null,
  title: "Landing",
  description: "A landing page",
  acceptanceCriteria: [],
  files: [],
  status: "ready",
  assignedAgent: null,
  attempts: 0,
  lastFeedback: null,
  reviewReason: null,
};

const validPlan = {
  subtasks: [
    {
      title: "Add hero section",
      description: "Render the hero",
      acceptanceCriteria: ["Hero shows the headline"],
      files: ["src/app/page.tsx"],
      runsInParallel: false,
    },
  ],
};

describe("claimAndOrchestrateRequest", () => {
  it("claims the next ready request and splits it into subtasks", async () => {
    const deps = createInMemoryDependencies({ requests: [request], tasks: [readyTask] });
    const claimAndOrchestrate = claimAndOrchestrateRequest({
      ...deps,
      ...inMemoryScaffoldDependencies(createInMemoryWorkspaceWriter({})),
      llm: createScriptedLlmClient({ ok: true, json: validPlan }),
    });

    const outcome = await claimAndOrchestrate();

    expect(outcome.ok).toBe(true);
    const tasks = await deps.tasks.list();
    expect(tasks.find((task) => task.id === "task-1")?.status).toBe("in_progress");
    expect(tasks.filter((task) => task.parentTaskId === "task-1").map((task) => task.title)).toEqual([
      "Add hero section",
    ]);
  });

  it("sends the request to review with the reason when the LLM call fails", async () => {
    const deps = createInMemoryDependencies({ requests: [request], tasks: [readyTask] });
    const claimAndOrchestrate = claimAndOrchestrateRequest({
      ...deps,
      ...inMemoryScaffoldDependencies(createInMemoryWorkspaceWriter({})),
      llm: createScriptedLlmClient({ ok: false, reason: "Gemini is unavailable" }),
    });

    const outcome = await claimAndOrchestrate();

    expect(outcome).toEqual({ ok: false, reason: "Gemini is unavailable" });
    const [task] = await deps.tasks.list();
    expect([task.status, task.reviewReason, task.lastFeedback]).toEqual([
      "review",
      "orchestration",
      "Gemini is unavailable",
    ]);
  });

  it("sends the request to review with a fallback reason when the failure has no text", async () => {
    const deps = createInMemoryDependencies({ requests: [request], tasks: [readyTask] });
    const claimAndOrchestrate = claimAndOrchestrateRequest({
      ...deps,
      ...inMemoryScaffoldDependencies(createInMemoryWorkspaceWriter({})),
      llm: createScriptedLlmClient({ ok: false, reason: "   " }),
    });

    const outcome = await claimAndOrchestrate();

    expect(outcome).toEqual({ ok: false, reason: "Orchestration failed without a reason" });
    const [task] = await deps.tasks.list();
    expect([task.status, task.reviewReason, task.lastFeedback]).toEqual([
      "review",
      "orchestration",
      "Orchestration failed without a reason",
    ]);
  });

  it("retries an invalid plan and sends the request to review after three attempts", async () => {
    const deps = createInMemoryDependencies({ requests: [request], tasks: [readyTask] });
    const claimAndOrchestrate = claimAndOrchestrateRequest({
      ...deps,
      ...inMemoryScaffoldDependencies(createInMemoryWorkspaceWriter({})),
      llm: createScriptedLlmClient({ ok: true, json: { subtasks: [] } }),
    });

    const outcome = await claimAndOrchestrate();

    expect(outcome.ok).toBe(false);
    const [task] = await deps.tasks.list();
    expect([task.status, task.attempts, task.reviewReason]).toEqual(["review", 3, "attempts"]);
  });

  it("reports that nothing is ready and creates nothing", async () => {
    const deps = createInMemoryDependencies({ requests: [request], tasks: [] });
    const claimAndOrchestrate = claimAndOrchestrateRequest({
      ...deps,
      ...inMemoryScaffoldDependencies(createInMemoryWorkspaceWriter({})),
      llm: createScriptedLlmClient({ ok: true, json: validPlan }),
    });

    const outcome = await claimAndOrchestrate();

    expect(outcome).toEqual({ ok: false, reason: "No task is ready to claim" });
    expect(await deps.tasks.list()).toEqual([]);
  });

  describe("after develop leaves subtasks in qa", () => {
    const heroPath = "src/app/page.tsx";
    const validPage = "export default function Page() { return <main>Hero</main>; }";

    const answeringLlm = (review: LlmReply): LlmClient => ({
      generateJson: async (prompt: string) => {
        if (prompt.includes("Review this subtask")) {
          return review;
        }

        if (prompt.includes("Implement this subtask")) {
          return { ok: true, json: { files: [{ path: heroPath, content: validPage }] } };
        }

        return { ok: true, json: validPlan };
      },
    });

    const runClaim = async (review: LlmReply) => {
      const deps = createInMemoryDependencies({ ...developSeed, tasks: [readyTask] });
      const claimAndOrchestrate = claimAndOrchestrateRequest({
        ...deps,
        ...inMemoryScaffoldDependencies(createInMemoryWorkspaceWriter({})),
        llm: answeringLlm(review),
      });

      const outcome = await claimAndOrchestrate();
      const subtask = (await deps.tasks.list()).find((task) => task.parentTaskId === "task-1");

      return { outcome, subtask };
    };

    it("moves the subtask to awaiting release when the testing review passes", async () => {
      const { outcome, subtask } = await runClaim({ ok: true, json: { passed: true, failures: [] } });

      expect(outcome.ok).toBe(true);
      expect([subtask?.status, subtask?.attempts]).toEqual(["awaiting_release", 0]);
    });

    it("sends the subtask back to in progress with the feedback when the testing review fails", async () => {
      const failing: LlmReply = {
        ok: true,
        json: {
          passed: false,
          failures: [{ criterion: "Hero shows the headline", file: heroPath, line: 1, message: "Headline missing" }],
        },
      };

      const { outcome, subtask } = await runClaim(failing);

      expect(outcome.ok).toBe(true);
      expect([subtask?.status, subtask?.attempts]).toEqual(["review", 3]);
      expect(subtask?.lastFeedback).toContain("Headline missing");
    });

    it("returns the split outcome when the testing run throws", async () => {
      const throwingLlm: LlmClient = {
        generateJson: async (prompt: string) => {
          if (prompt.includes("Review this subtask")) {
            throw new Error("review crashed");
          }

          return answeringLlm({ ok: true, json: { passed: true, failures: [] } }).generateJson(prompt);
        },
      };
      const deps = createInMemoryDependencies({ ...developSeed, tasks: [readyTask] });
      const claimAndOrchestrate = claimAndOrchestrateRequest({
        ...deps,
        ...inMemoryScaffoldDependencies(createInMemoryWorkspaceWriter({})),
        llm: throwingLlm,
      });

      const outcome = await claimAndOrchestrate();

      expect(outcome.ok).toBe(true);
      const subtask = (await deps.tasks.list()).find((task) => task.parentTaskId === "task-1");
      expect(subtask?.status).toBe("qa");
    });

    it("develops and tests every subtask when qa holds only one task at a time", async () => {
      const twoFilePlan = {
        subtasks: [
          { title: "First", description: "Write A", acceptanceCriteria: ["ok"], files: ["src/a.tsx"], runsInParallel: false },
          { title: "Second", description: "Write B", acceptanceCriteria: ["ok"], files: ["src/b.tsx"], runsInParallel: false },
        ],
      };
      const llm: LlmClient = {
        generateJson: async (prompt: string) => {
          if (prompt.includes("Review this subtask")) {
            return { ok: true, json: { passed: true, failures: [] } };
          }
          if (prompt.includes("Implement this subtask")) {
            const path = prompt.match(/You may write only these files: ([^\n]+)/)?.[1] ?? "";
            return { ok: true, json: { files: [{ path, content: "export {};" }] } };
          }
          return { ok: true, json: twoFilePlan };
        },
      };
      const deps = createInMemoryDependencies({ ...developSeed, tasks: [readyTask] });
      await deps.settings.save({ ...(await deps.settings.get()), maxQaTasks: 1 });
      const claimAndOrchestrate = claimAndOrchestrateRequest({
        ...deps,
        ...inMemoryScaffoldDependencies(createInMemoryWorkspaceWriter({})),
        llm,
      });

      await claimAndOrchestrate();

      const statuses = (await deps.tasks.list()).filter((task) => task.parentTaskId === "task-1").map((task) => task.status);
      expect(statuses).toEqual(["awaiting_release", "awaiting_release"]);
    });
  });
});
