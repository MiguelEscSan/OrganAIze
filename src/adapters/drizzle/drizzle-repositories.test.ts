import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { defaultAppSettings } from "@/domain/settings/app-settings";
import type { Request } from "@/domain/requests/request";
import type { Task } from "@/domain/tasks/task";
import { createDrizzleEventLog } from "./drizzle-event-log";
import { createDrizzleRequestRepository } from "./drizzle-request-repository";
import { createDrizzleSettingsRepository } from "./drizzle-settings-repository";
import { createDrizzleTaskRepository } from "./drizzle-task-repository";
import { openTestDatabase, resetTestDatabase } from "./test-support";
import type { Database } from "./client";
import { requests as requestsTable } from "./schema";

const clock = { now: () => "2026-11-23T10:00:00.000Z" };
const request: Request = { id: "request-1", title: "Landing", description: "<p>x</p>" };
const taskOf = (id: string, status: Task["status"] = "definition"): Task => ({
  id,
  requestId: "request-1",
  title: id,
  description: "",
  status,
  assignedAgent: null,
  attempts: 0,
  lastFeedback: null,
  reviewReason: null,
});

let db: Database;

beforeAll(async () => {
  db = await openTestDatabase();
});

beforeEach(async () => {
  await resetTestDatabase(db);
  await db.insert(requestsTable).values(request);
});

afterAll(async () => {
  await db.$client.end();
});

describe("drizzle request repository", () => {
  it("saves, updates and removes a request", async () => {
    const repository = createDrizzleRequestRepository(db);

    await repository.save({ ...request, title: "Renamed" });

    expect(await repository.list()).toEqual([{ ...request, title: "Renamed" }]);

    await repository.remove(request.id);

    expect(await repository.list()).toEqual([]);
  });
});

describe("drizzle task repository", () => {
  it("lists tasks in the order they were first stored", async () => {
    const repository = createDrizzleTaskRepository(db);

    await repository.replaceAll([taskOf("t2"), taskOf("t1")]);

    expect((await repository.list()).map((task) => task.id)).toEqual(["t2", "t1"]);
  });

  it("keeps the queue position of an updated task", async () => {
    const repository = createDrizzleTaskRepository(db);
    await repository.replaceAll([taskOf("t1", "ready"), taskOf("t2", "ready")]);

    await repository.replaceAll([taskOf("t1", "ready"), { ...taskOf("t2", "ready"), title: "changed" }]);

    expect((await repository.list()).map((task) => task.id)).toEqual(["t1", "t2"]);
  });

  it("deletes tasks that are not in the replacement list", async () => {
    const repository = createDrizzleTaskRepository(db);
    await repository.replaceAll([taskOf("t1"), taskOf("t2")]);

    await repository.replaceAll([taskOf("t2")]);

    expect((await repository.list()).map((task) => task.id)).toEqual(["t2"]);
  });

  it("hands the single in-progress slot to another task in one replacement", async () => {
    const repository = createDrizzleTaskRepository(db);
    await repository.replaceAll([taskOf("t1", "in_progress"), taskOf("t2", "ready")]);

    await repository.replaceAll([taskOf("t2", "in_progress"), taskOf("t1", "qa")]);

    expect((await repository.list()).map((task) => [task.id, task.status])).toEqual([
      ["t1", "qa"],
      ["t2", "in_progress"],
    ]);
  });

  it("refuses a second in-progress task at the database level", async () => {
    const repository = createDrizzleTaskRepository(db);
    await repository.replaceAll([taskOf("t1", "in_progress")]);

    await expect(repository.replaceAll([taskOf("t1", "in_progress"), taskOf("t2", "in_progress")])).rejects.toThrow();
  });
});

describe("drizzle event log", () => {
  it("appends events with the clock time and lists them in order", async () => {
    const log = createDrizzleEventLog(db, clock);

    await log.append({ taskId: "t1", from: "definition", to: "ready", actor: "user", reason: "Moved by user" });

    expect(await log.list()).toEqual([
      {
        taskId: "t1",
        from: "definition",
        to: "ready",
        actor: "user",
        reason: "Moved by user",
        at: "2026-11-23T10:00:00.000Z",
      },
    ]);
  });
});

describe("drizzle settings repository", () => {
  it("returns the defaults until settings are saved", async () => {
    const repository = createDrizzleSettingsRepository(db);

    expect(await repository.get()).toEqual(defaultAppSettings);
  });

  it("saves settings and returns them on the next read", async () => {
    const repository = createDrizzleSettingsRepository(db);

    await repository.save({ maxAttempts: 5, maxMinutes: 20, maxTokens: 80_000 });
    await repository.save({ maxAttempts: 4, maxMinutes: 25, maxTokens: 90_000 });

    expect(await repository.get()).toEqual({ maxAttempts: 4, maxMinutes: 25, maxTokens: 90_000 });
  });
});
