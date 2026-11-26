import { describe, expect, it } from "vitest";
import { buildTask } from "@/adapters/in-memory/task-fixtures";
import type { TaskStatus } from "./task-status";
import { requestReadyForQa } from "./request-ready-for-qa";

const requestWith = (subtaskStatuses: TaskStatus[], requestStatus: TaskStatus = "in_progress") => [
  buildTask({ id: "request", status: requestStatus }),
  ...subtaskStatuses.map((status, index) => buildTask({ id: `subtask-${index + 1}`, parentTaskId: "request", status })),
];

describe("requestReadyForQa", () => {
  it("moves the request to qa when every subtask is awaiting release", () => {
    const result = requestReadyForQa(requestWith(["awaiting_release", "awaiting_release"]), "request");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.tasks.find((task) => task.id === "request")?.status).toBe("qa");
      expect(result.event).toEqual(
        expect.objectContaining({ taskId: "request", from: "in_progress", to: "qa", actor: "system" }),
      );
    }
  });

  it("keeps the request in progress while a subtask is still in qa", () => {
    const result = requestReadyForQa(requestWith(["awaiting_release", "qa"]), "request");

    expect(result.ok).toBe(false);
  });

  it("keeps the request in progress while a subtask is still in progress", () => {
    const result = requestReadyForQa(requestWith(["awaiting_release", "in_progress"]), "request");

    expect(result.ok).toBe(false);
  });

  it("refuses a request without subtasks", () => {
    const result = requestReadyForQa(requestWith([]), "request");

    expect(result.ok).toBe(false);
  });

  it("refuses a request that is not in progress", () => {
    const result = requestReadyForQa(requestWith(["awaiting_release"], "ready"), "request");

    expect(result.ok).toBe(false);
  });

  it("refuses a subtask", () => {
    const result = requestReadyForQa(requestWith(["awaiting_release"]), "subtask-1");

    expect(result.ok).toBe(false);
  });

  it("refuses an unknown request", () => {
    expect(requestReadyForQa([], "missing").ok).toBe(false);
  });
});
