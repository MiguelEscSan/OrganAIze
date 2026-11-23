import { describe, expect, it } from "vitest";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import { buildTask } from "@/adapters/in-memory/task-fixtures";
import { moveTask } from "./move-task";

describe("moveTask", () => {
  it("moves a definition task to ready and records the event", async () => {
    const deps = createInMemoryDependencies({ tasks: [buildTask({ id: "t1", status: "definition" })] });

    const outcome = await moveTask(deps)({ kind: "MoveTask", taskId: "t1", to: "ready" });

    expect(outcome.ok).toBe(true);
    expect((await deps.tasks.list())[0].status).toBe("ready");
    expect(await deps.events.list()).toEqual([
      {
        taskId: "t1",
        from: "definition",
        to: "ready",
        actor: "user",
        reason: "Moved by user",
        at: "2026-11-23T10:00:00.000Z",
      },
    ]);
  });

  it("refuses the user to move a task that the system already runs", async () => {
    const deps = createInMemoryDependencies({ tasks: [buildTask({ id: "t1", status: "in_progress" })] });

    const outcome = await moveTask(deps)({ kind: "MoveTask", taskId: "t1", to: "ready" });

    expect(outcome).toEqual({ ok: false, reason: "user cannot move a task from in_progress to ready" });
    expect((await deps.tasks.list())[0].status).toBe("in_progress");
    expect(await deps.events.list()).toEqual([]);
  });

  it("refuses an unknown task", async () => {
    const deps = createInMemoryDependencies();

    expect(await moveTask(deps)({ kind: "MoveTask", taskId: "missing", to: "ready" })).toEqual({
      ok: false,
      reason: "Task not found",
    });
  });
});
