import { describe, expect, it } from "vitest";
import { buildTask } from "@/adapters/in-memory/task-fixtures";
import { developActivity } from "./develop-activity";

describe("developActivity", () => {
  it("reports working on the develop subtask that is in progress", () => {
    const tasks = [
      buildTask({ id: "subtask-1", title: "Add hero", status: "in_progress", assignedAgent: "develop" }),
    ];

    expect(developActivity(tasks)).toEqual({ state: "working", message: 'Working on "Add hero"' });
  });

  it("reports idle when no develop subtask is in progress", () => {
    const tasks = [
      buildTask({ id: "subtask-1", status: "qa", assignedAgent: "develop" }),
      buildTask({ id: "subtask-2", status: "in_progress", assignedAgent: "testing" }),
    ];

    expect(developActivity(tasks)).toEqual({ state: "idle", message: "No subtask is waiting for Develop" });
  });
});
