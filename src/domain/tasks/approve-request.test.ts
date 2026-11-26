import { describe, expect, it } from "vitest";
import { buildTask } from "@/adapters/in-memory/task-fixtures";
import type { TaskStatus } from "./task-status";
import { approveRequest } from "./approve-request";

const evidence = "Reviewed the running app: 5 characters of visible text.";

const requestWith = (subtaskStatuses: TaskStatus[], requestStatus: TaskStatus = "qa") => [
  buildTask({ id: "request", status: requestStatus }),
  ...subtaskStatuses.map((status, index) => buildTask({ id: `subtask-${index + 1}`, parentTaskId: "request", status })),
  buildTask({ id: "other-request", status: "ready" }),
];

describe("approveRequest", () => {
  it("moves the request and every subtask to deploy with one event each", () => {
    const result = approveRequest(requestWith(["awaiting_release", "awaiting_release"]), "request", evidence);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const statusOf = (id: string) => result.tasks.find((task) => task.id === id)?.status;
      expect(statusOf("request")).toBe("deploy");
      expect(statusOf("subtask-1")).toBe("deploy");
      expect(statusOf("subtask-2")).toBe("deploy");
      expect(statusOf("other-request")).toBe("ready");
      expect(result.events).toEqual([
        expect.objectContaining({ taskId: "request", from: "qa", to: "deploy", actor: "system", reason: `Request QA passed. ${evidence}` }),
        expect.objectContaining({ taskId: "subtask-1", from: "awaiting_release", to: "deploy", actor: "system", reason: "Released with its request" }),
        expect.objectContaining({ taskId: "subtask-2", from: "awaiting_release", to: "deploy", actor: "system", reason: "Released with its request" }),
      ]);
    }
  });

  it("refuses when a subtask is not awaiting release", () => {
    expect(approveRequest(requestWith(["awaiting_release", "qa"]), "request", evidence).ok).toBe(false);
  });

  it("refuses when the request is not in qa", () => {
    expect(approveRequest(requestWith(["awaiting_release"], "in_progress"), "request", evidence).ok).toBe(false);
  });

  it("refuses a request without subtasks", () => {
    expect(approveRequest(requestWith([]), "request", evidence).ok).toBe(false);
  });

  it("refuses an unknown request", () => {
    expect(approveRequest([], "missing", evidence).ok).toBe(false);
  });
});
