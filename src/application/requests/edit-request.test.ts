import { describe, expect, it } from "vitest";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import type { Request } from "@/domain/requests/request";
import type { Task } from "@/domain/tasks/task";
import { editRequest } from "./edit-request";

const request: Request = { id: "request-1", title: "Old", description: "old text" };
const definitionTask: Task = {
  id: "task-1",
  requestId: "request-1",
  title: "Old",
  description: "old text",
  status: "definition",
  assignedAgent: null,
  attempts: 0,
  lastFeedback: null,
  reviewReason: null,
};

describe("editRequest", () => {
  it("updates the request and its definition task", async () => {
    const deps = createInMemoryDependencies({ requests: [request], tasks: [definitionTask] });

    const outcome = await editRequest(deps)({
      kind: "EditRequest",
      requestId: "request-1",
      title: " New title ",
      description: "new text",
    });

    expect(outcome.ok).toBe(true);
    expect(await deps.requests.list()).toEqual([{ id: "request-1", title: "New title", description: "new text" }]);
    expect((await deps.tasks.list())[0]).toMatchObject({ title: "New title", description: "new text" });
  });

  it("refuses to edit when a task has already left definition", async () => {
    const readyTask: Task = { ...definitionTask, status: "ready" };
    const deps = createInMemoryDependencies({ requests: [request], tasks: [readyTask] });

    const outcome = await editRequest(deps)({
      kind: "EditRequest",
      requestId: "request-1",
      title: "New",
      description: "",
    });

    expect(outcome).toEqual({ ok: false, reason: "Only requests whose tasks are all in definition can be edited" });
    expect(await deps.requests.list()).toEqual([request]);
  });

  it("refuses an unknown request", async () => {
    const deps = createInMemoryDependencies();

    const outcome = await editRequest(deps)({ kind: "EditRequest", requestId: "missing", title: "New", description: "" });

    expect(outcome).toEqual({ ok: false, reason: "Request not found" });
  });

  it("refuses an empty title and changes nothing", async () => {
    const deps = createInMemoryDependencies({ requests: [request], tasks: [definitionTask] });

    const outcome = await editRequest(deps)({ kind: "EditRequest", requestId: "request-1", title: " ", description: "" });

    expect(outcome).toEqual({ ok: false, reason: "A request needs a title" });
    expect(await deps.requests.list()).toEqual([request]);
  });
});
