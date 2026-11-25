import { describe, expect, it } from "vitest";
import { createInMemoryArchiveWriter } from "@/adapters/in-memory/in-memory-archive-writer";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import { createScriptedLlmClient } from "@/adapters/in-memory/in-memory-llm-client";
import { createInMemoryWorkspaceWriter } from "@/adapters/in-memory/in-memory-workspace-writer";
import { buildTask } from "@/adapters/in-memory/task-fixtures";
import { developSeed, inMemoryWorkspaceDependencies } from "@/adapters/in-memory/in-memory-workspace-dependencies";
import { createMediator } from "./register-handlers";

const createDependenciesWithLlm = () => ({
  ...createInMemoryDependencies(),
  llm: createScriptedLlmClient({ ok: false, reason: "not used in this test" }),
  ...inMemoryWorkspaceDependencies(createInMemoryWorkspaceWriter({})),
  interfaceProbe: { inspect: async () => ({ ok: false as const, reason: "not used in this test" }) },
  projectFiles: { list: async () => [] },
  archiveWriter: createInMemoryArchiveWriter(),
});

describe("createMediator", () => {
  it("creates a request through the mediator and reads it back through a query", async () => {
    const mediator = createMediator(createDependenciesWithLlm());

    await mediator.send({ kind: "CreateRequest", boardId: "board-1", title: "Landing page", description: "" });
    const summaries = await mediator.ask<{ kind: "ListRequests" }, { request: { title: string }; total: number }[]>({
      kind: "ListRequests",
    });

    expect(summaries).toEqual([expect.objectContaining({ total: 1, request: expect.objectContaining({ title: "Landing page" }) })]);
  });

  it("runs a develop subtask through the mediator and writes its files", async () => {
    const task = buildTask({
      id: "subtask-1",
      requestId: "request-1",
      parentTaskId: "parent-1",
      status: "in_progress",
      assignedAgent: "develop",
      files: ["src/app/page.tsx"],
    });
    const workspace = createInMemoryWorkspaceWriter({});
    const deps = {
      ...createInMemoryDependencies({ ...developSeed, tasks: [task] }),
      llm: createScriptedLlmClient({ ok: true, json: { files: [{ path: "src/app/page.tsx", content: "new" }] } }),
      ...inMemoryWorkspaceDependencies(workspace),
      interfaceProbe: { inspect: async () => ({ ok: false as const, reason: "not used in this test" }) },
  projectFiles: { list: async () => [] },
      archiveWriter: createInMemoryArchiveWriter(),
    };
    const mediator = createMediator(deps);

    const outcome = await mediator.send<{ kind: "RunDevelop"; taskId: string }, { ok: boolean }>({
      kind: "RunDevelop",
      taskId: "subtask-1",
    });

    expect(outcome.ok).toBe(true);
    expect(workspace.files()).toEqual({ "src/app/page.tsx": "new" });
  });

  it("routes a claim through the mediator and moves the next ready task", async () => {
    const deps = createDependenciesWithLlm();
    const mediator = createMediator(deps);
    await mediator.send({ kind: "CreateRequest", boardId: "board-1", title: "Landing", description: "" });
    const [created] = await deps.tasks.list();
    await mediator.send({ kind: "MoveTask", taskId: created.id, to: "ready" });

    const claimed = await mediator.send<{ kind: "ClaimNextReadyTask" }, { ok: boolean }>({ kind: "ClaimNextReadyTask" });

    expect(claimed.ok).toBe(true);
    expect((await deps.tasks.list())[0].status).toBe("in_progress");
  });
});
