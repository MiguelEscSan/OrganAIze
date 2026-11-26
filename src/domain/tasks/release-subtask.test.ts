import { describe, expect, it } from "vitest";
import { buildTask } from "@/adapters/in-memory/task-fixtures";
import { releaseSubtask } from "./release-subtask";

describe("releaseSubtask", () => {
  it("moves a subtask in qa to awaiting release as the system", () => {
    const tasks = [
      buildTask({ id: "request", status: "in_progress" }),
      buildTask({ id: "subtask", parentTaskId: "request", status: "qa" }),
    ];

    const result = releaseSubtask(tasks, "subtask");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.tasks.find((task) => task.id === "subtask")?.status).toBe("awaiting_release");
      expect(result.event).toEqual(
        expect.objectContaining({ taskId: "subtask", from: "qa", to: "awaiting_release", actor: "system" }),
      );
    }
  });

  it("refuses a subtask that is not in qa", () => {
    const tasks = [buildTask({ id: "subtask", parentTaskId: "request", status: "in_progress" })];

    expect(releaseSubtask(tasks, "subtask").ok).toBe(false);
  });

  it("refuses a request task", () => {
    const tasks = [buildTask({ id: "request", status: "qa" })];

    expect(releaseSubtask(tasks, "request").ok).toBe(false);
  });

  it("refuses an unknown task", () => {
    expect(releaseSubtask([], "missing").ok).toBe(false);
  });
});
