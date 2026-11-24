import { describe, expect, it } from "vitest";
import { buildTask } from "@/adapters/in-memory/task-fixtures";
import { completeRequestTask } from "./complete-request-task";

const requestWith = (parentStatus: "in_progress" | "ready", subtaskStatuses: Array<"qa" | "deploy">) => [
  buildTask({ id: "request", status: parentStatus }),
  ...subtaskStatuses.map((status, index) =>
    buildTask({ id: `subtask-${index + 1}`, parentTaskId: "request", status, assignedAgent: "develop" }),
  ),
];

describe("completeRequestTask", () => {
  it("moves the request task to deploy when every subtask is in deploy", () => {
    const result = completeRequestTask(requestWith("in_progress", ["deploy", "deploy"]), "request");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.tasks.find((task) => task.id === "request")?.status).toBe("deploy");
      expect(result.event).toEqual(
        expect.objectContaining({ taskId: "request", from: "in_progress", to: "deploy", actor: "system" }),
      );
    }
  });

  it("keeps the request task in progress while a subtask is still in qa", () => {
    const result = completeRequestTask(requestWith("in_progress", ["deploy", "qa"]), "request");

    expect(result.ok).toBe(false);
  });

  it("refuses a request task that has no subtasks", () => {
    const result = completeRequestTask([buildTask({ id: "request", status: "in_progress" })], "request");

    expect(result.ok).toBe(false);
  });

  it("refuses a request task that is not in progress", () => {
    const result = completeRequestTask(requestWith("ready", ["deploy"]), "request");

    expect(result.ok).toBe(false);
  });
});
