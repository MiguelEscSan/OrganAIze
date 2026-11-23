import { describe, expect, it } from "vitest";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import { createMediator } from "./register-handlers";

describe("createMediator", () => {
  it("creates a request through the mediator and reads it back through a query", async () => {
    const mediator = createMediator(createInMemoryDependencies());

    await mediator.send({ kind: "CreateRequest", boardId: "board-1", title: "Landing page", description: "" });
    const summaries = await mediator.ask<{ kind: "ListRequests" }, { request: { title: string }; total: number }[]>({
      kind: "ListRequests",
    });

    expect(summaries).toEqual([expect.objectContaining({ total: 1, request: expect.objectContaining({ title: "Landing page" }) })]);
  });

  it("routes a claim through the mediator and moves the next ready task", async () => {
    const deps = createInMemoryDependencies();
    const mediator = createMediator(deps);
    await mediator.send({ kind: "CreateRequest", boardId: "board-1", title: "Landing", description: "" });
    const [created] = await deps.tasks.list();
    await mediator.send({ kind: "MoveTask", taskId: created.id, to: "ready" });

    const claimed = await mediator.send<{ kind: "ClaimNextReadyTask" }, { ok: boolean }>({ kind: "ClaimNextReadyTask" });

    expect(claimed.ok).toBe(true);
    expect((await deps.tasks.list())[0].status).toBe("in_progress");
  });
});
