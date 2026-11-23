import { describe, expect, it } from "vitest";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import { buildTask } from "@/adapters/in-memory/task-fixtures";
import { submitTestResult } from "./submit-test-result";

describe("submitTestResult", () => {
  it("moves a passing task from qa to deploy", async () => {
    const deps = createInMemoryDependencies({ tasks: [buildTask({ id: "t1", status: "qa" })] });

    const outcome = await submitTestResult(deps)({ kind: "SubmitTestResult", taskId: "t1", verdict: { passed: true } });

    expect(outcome.ok).toBe(true);
    expect((await deps.tasks.list())[0].status).toBe("deploy");
    expect(await deps.events.list()).toEqual([
      expect.objectContaining({ taskId: "t1", from: "qa", to: "deploy", actor: "system" }),
    ]);
  });

  it("sends a rejected task back to in_progress with feedback and one more attempt", async () => {
    const deps = createInMemoryDependencies({ tasks: [buildTask({ id: "t1", status: "qa", attempts: 0 })] });

    const outcome = await submitTestResult(deps)({
      kind: "SubmitTestResult",
      taskId: "t1",
      verdict: { passed: false, feedback: "1. Email validation accepts 'a@b'." },
    });

    expect(outcome.ok).toBe(true);
    expect((await deps.tasks.list())[0]).toMatchObject({
      status: "in_progress",
      attempts: 1,
      lastFeedback: "1. Email validation accepts 'a@b'.",
    });
    expect(await deps.events.list()).toEqual([
      expect.objectContaining({ taskId: "t1", from: "qa", to: "in_progress", actor: "system" }),
    ]);
  });

  it("moves a task to review on its third rejection", async () => {
    const deps = createInMemoryDependencies({ tasks: [buildTask({ id: "t1", status: "qa", attempts: 2 })] });

    await submitTestResult(deps)({
      kind: "SubmitTestResult",
      taskId: "t1",
      verdict: { passed: false, feedback: "3. Still broken." },
    });

    expect((await deps.tasks.list())[0]).toMatchObject({ status: "review", attempts: 3, reviewReason: "attempts" });
  });

  it("refuses a rejection without feedback and changes nothing", async () => {
    const deps = createInMemoryDependencies({ tasks: [buildTask({ id: "t1", status: "qa" })] });

    const outcome = await submitTestResult(deps)({
      kind: "SubmitTestResult",
      taskId: "t1",
      verdict: { passed: false, feedback: "  " },
    });

    expect(outcome).toEqual({ ok: false, reason: "A rejection needs feedback" });
    expect((await deps.tasks.list())[0].status).toBe("qa");
    expect(await deps.events.list()).toEqual([]);
  });

  it("refuses a result for a task that is not in qa", async () => {
    const deps = createInMemoryDependencies({ tasks: [buildTask({ id: "t1", status: "in_progress" })] });

    const outcome = await submitTestResult(deps)({ kind: "SubmitTestResult", taskId: "t1", verdict: { passed: true } });

    expect(outcome).toEqual({ ok: false, reason: "system cannot move a task from in_progress to deploy" });
  });
});
