import { describe, expect, it } from "vitest";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import { createScriptedLlmClient } from "@/adapters/in-memory/in-memory-llm-client";
import { createInMemoryWorkspaceWriter } from "@/adapters/in-memory/in-memory-workspace-writer";
import { inMemoryScaffoldDependencies } from "@/adapters/in-memory/in-memory-workspace-dependencies";
import { buildTask } from "@/adapters/in-memory/task-fixtures";
import type { Request } from "@/domain/requests/request";
import { resumeSubtask } from "./resume-subtask";

const request: Request = { id: "request-1", boardId: "board-1", title: "Landing", description: "A landing page" };

const setup = (tasks: ReturnType<typeof buildTask>[]) => {
  const deps = createInMemoryDependencies({ requests: [request], tasks });
  const resume = resumeSubtask({
    ...deps,
    ...inMemoryScaffoldDependencies(createInMemoryWorkspaceWriter({})),
    llm: createScriptedLlmClient({ ok: false, reason: "Ollama is unavailable" }),
  });

  return { deps, resume };
};

const parent = buildTask({ id: "p1", requestId: "request-1", status: "in_progress" });

describe("resumeSubtask", () => {
  it("develops an in progress subtask again when its run stopped", async () => {
    const subtask = buildTask({
      id: "t1",
      requestId: "request-1",
      parentTaskId: "p1",
      status: "in_progress",
      assignedAgent: "develop",
      attempts: 0,
    });
    const { deps, resume } = setup([parent, subtask]);

    const outcome = await resume({ kind: "ResumeSubtask", taskId: "t1" });

    expect(outcome.ok).toBe(true);
    const current = (await deps.tasks.list()).find((task) => task.id === "t1");
    expect([current?.status, current?.attempts]).toEqual(["review", 6]);
  });

  it("refuses a task that is not an in progress subtask", async () => {
    const reviewed = buildTask({
      id: "t1",
      requestId: "request-1",
      parentTaskId: "p1",
      status: "review",
      assignedAgent: "develop",
    });
    const { deps, resume } = setup([parent, reviewed]);

    const outcome = await resume({ kind: "ResumeSubtask", taskId: "t1" });

    expect(outcome).toEqual({ ok: false, reason: "Only a develop subtask in progress can be resumed" });
    expect((await deps.tasks.list()).find((task) => task.id === "t1")?.status).toBe("review");
  });

  it("refuses a request task", async () => {
    const { resume } = setup([parent]);

    const outcome = await resume({ kind: "ResumeSubtask", taskId: "p1" });

    expect(outcome.ok).toBe(false);
  });
});
