import { describe, expect, it } from "vitest";
import type { AgentActivityRecord } from "@/domain/agents/agent-activity";
import type { AgentActivityRepository } from "@/ports/agent-activity-repository";
import type { LlmClient, LlmReply } from "@/ports/llm-client";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import { createScriptedLlmClient } from "@/adapters/in-memory/in-memory-llm-client";
import { createInMemoryWorkspaceWriter } from "@/adapters/in-memory/in-memory-workspace-writer";
import { buildTask } from "@/adapters/in-memory/task-fixtures";
import { createInMemoryWorkspaceReader } from "@/adapters/in-memory/in-memory-workspace-reader";
import { developSeed, inMemoryDevelopDependencies, inMemoryScaffoldDependencies, inMemoryWorkspaceDependencies } from "@/adapters/in-memory/in-memory-workspace-dependencies";
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
    const orchestrate = orchestrateRequest({
      ...deps,
      ...inMemoryScaffoldDependencies(createInMemoryWorkspaceWriter()),
      llm: createScriptedLlmClient({ ok: true, json: split }),
    });

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
    const develop = runDevelop({ ...deps, ...inMemoryDevelopDependencies(workspace), llm });

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

  it("keeps develop working while a parallel subtask is still running", async () => {
    const subtask = (id: string, path: string) =>
      buildTask({
        id,
        requestId: "request-1",
        parentTaskId: "parent-1",
        title: id,
        status: "in_progress",
        assignedAgent: "develop",
        files: [path],
      });
    const deps = createInMemoryDependencies({
      ...developSeed,
      tasks: [subtask("subtask-1", "src/app/one.tsx"), subtask("subtask-2", "src/app/two.tsx")],
    });
    const pending: ((reply: LlmReply) => void)[] = [];
    const llm: LlmClient = {
      generateJson: () =>
        new Promise<LlmReply>((resolve) => {
          pending.push(resolve);
        }),
    };
    const develop = runDevelop({ ...deps, ...inMemoryDevelopDependencies(createInMemoryWorkspaceWriter({})), llm });
    const developActivity = async () => (await deps.activity.list()).find((record) => record.agent === "develop");
    const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
    const filesReply = (path: string): LlmReply => ({ ok: true, json: { files: [{ path, content: "export default 1;" }] } });

    const first = develop({ kind: "RunDevelop", taskId: "subtask-1" });
    const second = develop({ kind: "RunDevelop", taskId: "subtask-2" });
    await settle();
    pending[0]?.(filesReply("src/app/one.tsx"));
    await first;

    expect(await developActivity()).toEqual({ agent: "develop", state: "working", message: "Working on 1 subtask" });

    await settle();
    pending[1]?.(filesReply("src/app/two.tsx"));
    await second;

    expect(await developActivity()).toEqual(expect.objectContaining({ state: "idle", message: "Waiting for a subtask in progress" }));
  });

  it("names the subtask that develop is writing", async () => {
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
    const recorded: AgentActivityRecord[] = [];
    const activity: AgentActivityRepository = {
      list: async () => [],
      record: async (record) => {
        recorded.push(record);
      },
    };
    const llm = createScriptedLlmClient({
      ok: true,
      json: { files: [{ path: "src/app/page.tsx", content: "export default 1;" }] },
    });
    const develop = runDevelop({
      ...deps,
      activity,
      ...inMemoryDevelopDependencies(createInMemoryWorkspaceWriter({})),
      llm,
    });

    await develop({ kind: "RunDevelop", taskId: "subtask-1" });

    expect(recorded[0]).toEqual({ agent: "develop", state: "working", message: expect.stringContaining("Hero") });
  });
});
