import { describe, expect, it } from "vitest";
import type { TaskEvent } from "./task-event";
import { maxRememberedFailures, previousFailuresOf } from "./previous-failures";

const creation: TaskEvent = {
  taskId: "t1",
  from: "in_progress",
  to: "in_progress",
  actor: "system",
  reason: "Created from p1 by the orchestrator",
};

const qaRejection = (reason: string, taskId = "t1"): TaskEvent => ({
  taskId,
  from: "qa",
  to: "in_progress",
  actor: "system",
  reason,
});

const developFailure = (reason: string): TaskEvent => ({
  taskId: "t1",
  from: "in_progress",
  to: "in_progress",
  actor: "system",
  reason,
});

describe("previousFailuresOf", () => {
  it("returns nothing for a task that never failed", () => {
    expect(previousFailuresOf([creation], "t1")).toEqual([]);
  });

  it("lists the failures of the task in order, numbered by attempt", () => {
    const events = [creation, developFailure("Develop output is not valid JSON"), qaRejection("1. Syntax error")];

    expect(previousFailuresOf(events, "t1")).toEqual([
      { attempt: 1, reason: "Develop output is not valid JSON" },
      { attempt: 2, reason: "1. Syntax error" },
    ]);
  });

  it("ignores the events of other tasks", () => {
    const events = [creation, qaRejection("Other task failed", "t2"), qaRejection("1. Syntax error")];

    expect(previousFailuresOf(events, "t1")).toEqual([{ attempt: 1, reason: "1. Syntax error" }]);
  });

  it("ignores decisions made by the user and budget stops", () => {
    const events: TaskEvent[] = [
      creation,
      qaRejection("1. Syntax error"),
      { taskId: "t1", from: "in_progress", to: "review", actor: "system", reason: "Stopped after 16 min" },
      { taskId: "t1", from: "review", to: "in_progress", actor: "user", reason: "Continued by the user" },
    ];

    expect(previousFailuresOf(events, "t1")).toEqual([{ attempt: 1, reason: "1. Syntax error" }]);
  });

  it("keeps only the most recent failures and their attempt numbers", () => {
    const events = [creation, ...Array.from({ length: maxRememberedFailures + 2 }, (_, index) => qaRejection(`Failure ${index + 1}`))];

    const failures = previousFailuresOf(events, "t1");

    expect(failures).toHaveLength(maxRememberedFailures);
    expect(failures[0]).toEqual({ attempt: 3, reason: "Failure 3" });
    expect(failures[failures.length - 1]).toEqual({ attempt: maxRememberedFailures + 2, reason: `Failure ${maxRememberedFailures + 2}` });
  });
});
