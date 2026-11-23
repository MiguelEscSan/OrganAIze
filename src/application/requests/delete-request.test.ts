import { describe, expect, it } from "vitest";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import type { Request } from "@/domain/requests/request";
import type { Task } from "@/domain/tasks/task";
import { deleteRequest } from "./delete-request";

const request: Request = { id: "request-1", boardId: "board-1", title: "Landing", description: "" };
const taskOf = (id: string, status: Task["status"]): Task => ({
  id,
  requestId: "request-1",
  title: "Landing",
  description: "",
  status,
  assignedAgent: null,
  attempts: 0,
  lastFeedback: null,
  reviewReason: null,
  parentTaskId: null,
});

describe("deleteRequest", () => {
  it("removes the request and all its tasks when they are in definition or review", async () => {
    const deps = createInMemoryDependencies({
      requests: [request],
      tasks: [taskOf("task-1", "definition"), taskOf("task-2", "review")],
    });

    const outcome = await deleteRequest(deps)({ kind: "DeleteRequest", requestId: "request-1" });

    expect(outcome).toEqual({ ok: true, value: undefined });
    expect(await deps.requests.list()).toEqual([]);
    expect(await deps.tasks.list()).toEqual([]);
  });

  it("refuses when a task is ready, in progress, in qa or deployed", async () => {
    const deps = createInMemoryDependencies({
      requests: [request],
      tasks: [taskOf("task-1", "definition"), taskOf("task-2", "in_progress")],
    });

    const outcome = await deleteRequest(deps)({ kind: "DeleteRequest", requestId: "request-1" });

    expect(outcome).toEqual({
      ok: false,
      reason: "Only requests whose tasks are all in definition or review can be deleted",
    });
    expect(await deps.requests.list()).toEqual([request]);
    expect(await deps.tasks.list()).toHaveLength(2);
  });

  it("refuses an unknown request", async () => {
    const deps = createInMemoryDependencies();

    const outcome = await deleteRequest(deps)({ kind: "DeleteRequest", requestId: "missing" });

    expect(outcome).toEqual({ ok: false, reason: "Request not found" });
  });
});
