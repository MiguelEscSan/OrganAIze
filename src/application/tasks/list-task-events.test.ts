import { describe, expect, it } from "vitest";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import { listTaskEvents } from "./list-task-events";

describe("list task events", () => {
  it("returns only the events of the requested task, oldest first", async () => {
    const deps = createInMemoryDependencies();
    await deps.events.append({ taskId: "task-1", from: "ready", to: "in_progress", actor: "system", reason: "Claimed" });
    await deps.events.append({ taskId: "task-2", from: "ready", to: "in_progress", actor: "system", reason: "Other" });
    await deps.events.append({ taskId: "task-1", from: "in_progress", to: "qa", actor: "system", reason: "Built" });

    const events = await listTaskEvents(deps)({ kind: "ListTaskEvents", taskId: "task-1" });

    expect(events.map((event) => event.reason)).toEqual(["Claimed", "Built"]);
  });

  it("returns an empty list for a task without events", async () => {
    const deps = createInMemoryDependencies();

    expect(await listTaskEvents(deps)({ kind: "ListTaskEvents", taskId: "missing" })).toEqual([]);
  });
});
