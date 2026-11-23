import { describe, expect, it } from "vitest";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import { createRequest } from "./create-request";

describe("createRequest", () => {
  it("stores the request and one task in definition", async () => {
    const deps = createInMemoryDependencies();

    const outcome = await createRequest(deps)({
      kind: "CreateRequest",
      title: "  Add contact page ",
      description: "<p>Form with name and email</p>",
    });

    expect(outcome.ok).toBe(true);
    expect(await deps.requests.list()).toEqual([
      { id: "id-1", title: "Add contact page", description: "<p>Form with name and email</p>" },
    ]);
    expect(await deps.tasks.list()).toEqual([
      {
        id: "id-2",
        requestId: "id-1",
        title: "Add contact page",
        description: "<p>Form with name and email</p>",
        status: "definition",
        assignedAgent: null,
        attempts: 0,
        lastFeedback: null,
        reviewReason: null,
      },
    ]);
  });

  it("refuses a request without a title and stores nothing", async () => {
    const deps = createInMemoryDependencies();

    const outcome = await createRequest(deps)({ kind: "CreateRequest", title: "   ", description: "" });

    expect(outcome).toEqual({ ok: false, reason: "A request needs a title" });
    expect(await deps.requests.list()).toEqual([]);
    expect(await deps.tasks.list()).toEqual([]);
  });

  it("writes no task event, because creation is not a transition", async () => {
    const deps = createInMemoryDependencies();

    await createRequest(deps)({ kind: "CreateRequest", title: "Landing", description: "" });

    expect(await deps.events.list()).toEqual([]);
  });
});
