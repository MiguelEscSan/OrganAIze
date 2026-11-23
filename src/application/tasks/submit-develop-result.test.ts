import { describe, expect, it } from "vitest";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import { buildTask } from "@/adapters/in-memory/task-fixtures";
import { submitDevelopResult } from "./submit-develop-result";

describe("submitDevelopResult", () => {
  it("moves the in-progress task to qa and records the event", async () => {
    const deps = createInMemoryDependencies({ tasks: [buildTask({ id: "t1", status: "in_progress" })] });

    const outcome = await submitDevelopResult(deps)({ kind: "SubmitDevelopResult", taskId: "t1" });

    expect(outcome.ok).toBe(true);
    expect((await deps.tasks.list())[0].status).toBe("qa");
    expect(await deps.events.list()).toEqual([
      expect.objectContaining({ taskId: "t1", from: "in_progress", to: "qa", actor: "system" }),
    ]);
  });

  it("refuses a task that is not in progress", async () => {
    const deps = createInMemoryDependencies({ tasks: [buildTask({ id: "t1", status: "ready" })] });

    const outcome = await submitDevelopResult(deps)({ kind: "SubmitDevelopResult", taskId: "t1" });

    expect(outcome).toEqual({ ok: false, reason: "system cannot move a task from ready to qa" });
    expect(await deps.events.list()).toEqual([]);
  });
});
