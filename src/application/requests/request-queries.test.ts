import { describe, expect, it } from "vitest";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import type { Request } from "@/domain/requests/request";
import type { Task } from "@/domain/tasks/task";
import { getRequest } from "./get-request";
import { listRequests } from "./list-requests";

const requests: Request[] = [
  { id: "request-1", boardId: "board-1", title: "Landing", description: "" },
  { id: "request-2", boardId: "board-1", title: "Contact", description: "" },
];
const taskOf = (id: string, requestId: string, status: Task["status"]): Task => ({
  id,
  requestId,
  title: id,
  description: "",
  acceptanceCriteria: [],
  files: [],
  status,
  assignedAgent: null,
  attempts: 0,
  lastFeedback: null,
  reviewReason: null,
  parentTaskId: null,
});
const tasks: Task[] = [
  taskOf("task-1", "request-1", "deploy"),
  taskOf("task-2", "request-1", "ready"),
  taskOf("task-3", "request-2", "definition"),
];

describe("listRequests", () => {
  it("lists every request with its subtask progress", async () => {
    const deps = createInMemoryDependencies({ requests, tasks });

    const summaries = await listRequests(deps)();

    expect(summaries).toEqual([
      { request: requests[0], total: 2, deployed: 1 },
      { request: requests[1], total: 1, deployed: 0 },
    ]);
  });

  it("returns an empty list when there are no requests", async () => {
    const deps = createInMemoryDependencies();

    expect(await listRequests(deps)()).toEqual([]);
  });
});

describe("getRequest", () => {
  it("returns the request with its tasks", async () => {
    const deps = createInMemoryDependencies({ requests, tasks });

    const outcome = await getRequest(deps)({ kind: "GetRequest", requestId: "request-1" });

    expect(outcome).toEqual({
      ok: true,
      value: { request: requests[0], tasks: [tasks[0], tasks[1]] },
    });
  });

  it("refuses an unknown request", async () => {
    const deps = createInMemoryDependencies({ requests, tasks });

    expect(await getRequest(deps)({ kind: "GetRequest", requestId: "missing" })).toEqual({
      ok: false,
      reason: "Request not found",
    });
  });
});
