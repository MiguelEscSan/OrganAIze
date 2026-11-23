import { describe, expect, it } from "vitest";
import { buildTask } from "@/adapters/in-memory/task-fixtures";
import { testingActivity } from "./testing-activity";

describe("testingActivity", () => {
  it("reports working on the task that is in qa", () => {
    const tasks = [buildTask({ id: "subtask-1", title: "Add hero", status: "qa", assignedAgent: "develop" })];

    expect(testingActivity(tasks)).toEqual({ state: "working", message: 'Reviewing "Add hero"' });
  });

  it("reports idle when no task is in qa", () => {
    const tasks = [
      buildTask({ id: "subtask-1", status: "in_progress", assignedAgent: "develop" }),
      buildTask({ id: "subtask-2", status: "deploy", assignedAgent: "testing" }),
    ];

    expect(testingActivity(tasks)).toEqual({ state: "idle", message: "No subtask is waiting for Testing" });
  });
});
