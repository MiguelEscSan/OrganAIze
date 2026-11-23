import { describe, expect, it } from "vitest";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import { buildTask } from "@/adapters/in-memory/task-fixtures";
import { defaultAppSettings } from "@/domain/settings/app-settings";
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

  it("keeps the task in progress when qa is already at capacity", async () => {
    const deps = createInMemoryDependencies({
      tasks: [
        buildTask({ id: "t1", status: "in_progress" }),
        buildTask({ id: "t2", status: "qa" }),
        buildTask({ id: "t3", status: "qa" }),
      ],
    });

    const outcome = await submitDevelopResult(deps)({ kind: "SubmitDevelopResult", taskId: "t1" });

    expect(outcome).toEqual({ ok: false, reason: "QA is full: 2 of 2 tasks are already in qa" });
    expect((await deps.tasks.list()).find((task) => task.id === "t1")?.status).toBe("in_progress");
    expect(await deps.events.list()).toEqual([]);
  });

  it("uses the configured QA capacity", async () => {
    const deps = createInMemoryDependencies({
      tasks: [buildTask({ id: "t1", status: "in_progress" }), buildTask({ id: "t2", status: "qa" })],
    });
    await deps.settings.save({ ...defaultAppSettings, maxQaTasks: 3 });

    const outcome = await submitDevelopResult(deps)({ kind: "SubmitDevelopResult", taskId: "t1" });

    expect(outcome.ok).toBe(true);
  });
});
