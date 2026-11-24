import { describe, expect, it } from "vitest";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import { createScriptedLlmClient } from "@/adapters/in-memory/in-memory-llm-client";
import { createInMemoryWorkspaceWriter } from "@/adapters/in-memory/in-memory-workspace-writer";
import { buildTask } from "@/adapters/in-memory/task-fixtures";
import { createInMemoryWorkspaceReader } from "@/adapters/in-memory/in-memory-workspace-reader";
import { developSeed, inMemoryWorkspaceDependencies } from "@/adapters/in-memory/in-memory-workspace-dependencies";
import { orchestrateRequest } from "@/application/tasks/orchestrate-request";
import { runDevelop } from "@/application/tasks/run-develop";
import { runTesting } from "@/application/testing/run-testing";

const passingReview = { ok: true as const, json: { passed: true, failures: [] } };

describe("agent activity", () => {
  it("shows the orchestrator splitting the request and then waiting", async () => {
    const parent = buildTask({ id: "parent", status: "in_progress", assignedAgent: null });
    const deps = createInMemoryDependencies({ ...developSeed, tasks: [parent] });
    const split = {
      subtasks: [
        {
          title: "Hero",
          description: "",
          acceptanceCriteria: ["Shows the headline"],
          files: ["src/app/page.tsx"],
          runsInParallel: false,
        },
      ],
    };
    const orchestrate = orchestrateRequest({ ...deps, llm: createScriptedLlmClient({ ok: true, json: split }) });

    await orchestrate({ kind: "OrchestrateRequest", taskId: "parent" });

    expect(await deps.activity.list()).toEqual(
      expect.arrayContaining([expect.objectContaining({ agent: "orchestrator", state: "idle" })]),
    );
  });

  it("shows develop writing the subtask and then waiting", async () => {
    const subtask = buildTask({
      id: "subtask-1",
      requestId: "request-1",
      parentTaskId: "parent-1",
      title: "Hero",
      status: "in_progress",
      assignedAgent: "develop",
      files: ["src/app/page.tsx"],
    });
    const deps = createInMemoryDependencies({ ...developSeed, tasks: [subtask] });
    const workspace = createInMemoryWorkspaceWriter({});
    const llm = createScriptedLlmClient({
      ok: true,
      json: { files: [{ path: "src/app/page.tsx", content: "export default 1;" }] },
    });
    const develop = runDevelop({ ...deps, ...inMemoryWorkspaceDependencies(workspace), llm });

    await develop({ kind: "RunDevelop", taskId: "subtask-1" });

    const develops = (await deps.activity.list()).filter((record) => record.agent === "develop");
    expect(develops).toEqual([expect.objectContaining({ state: "idle" })]);
  });

  it("shows testing reviewing the subtask in qa and then waiting", async () => {
    const qa = buildTask({
      id: "subtask-1",
      requestId: "request-1",
      parentTaskId: "parent-1",
      title: "Hero",
      status: "qa",
      assignedAgent: "develop",
      files: ["src/app/page.tsx"],
    });
    const deps = createInMemoryDependencies({ ...developSeed, tasks: [qa] });
    const reader = createInMemoryWorkspaceReader({ "src/app/page.tsx": "export default 1;" });
    const testing = runTesting({
      ...deps,
      ...inMemoryWorkspaceDependencies(reader),
      llm: createScriptedLlmClient(passingReview),
    });

    await testing();

    const testings = (await deps.activity.list()).filter((record) => record.agent === "testing");
    expect(testings).toEqual([expect.objectContaining({ state: "idle" })]);
  });
});
