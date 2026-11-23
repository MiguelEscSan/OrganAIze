import { describe, expect, it } from "vitest";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import { buildTask } from "@/adapters/in-memory/task-fixtures";
import { claimNextReadyTask } from "./claim-next-ready-task";

describe("claimNextReadyTask", () => {
  it("claims the first ready task in queue order", async () => {
    const deps = createInMemoryDependencies({
      tasks: [
        buildTask({ id: "t1", status: "ready" }),
        buildTask({ id: "t2", status: "ready" }),
      ],
    });

    const outcome = await claimNextReadyTask(deps)();

    expect(outcome.ok).toBe(true);
    expect((await deps.tasks.list()).map((task) => [task.id, task.status])).toEqual([
      ["t1", "in_progress"],
      ["t2", "ready"],
    ]);
    expect(await deps.events.list()).toEqual([
      expect.objectContaining({ taskId: "t1", from: "ready", to: "in_progress", actor: "system" }),
    ]);
  });

  it("refuses to claim while another task is in progress", async () => {
    const deps = createInMemoryDependencies({
      tasks: [buildTask({ id: "t1", status: "in_progress" }), buildTask({ id: "t2", status: "ready" })],
    });

    const outcome = await claimNextReadyTask(deps)();

    expect(outcome).toEqual({ ok: false, reason: "Another task is already in progress" });
    expect((await deps.tasks.list())[1].status).toBe("ready");
  });

  it("refuses when nothing is ready", async () => {
    const deps = createInMemoryDependencies({ tasks: [buildTask({ id: "t1", status: "definition" })] });

    expect(await claimNextReadyTask(deps)()).toEqual({
      ok: false,
      reason: "No task is ready to claim",
    });
  });
});
