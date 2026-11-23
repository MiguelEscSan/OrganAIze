import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { defaultAppSettings } from "@/domain/settings/app-settings";
import type { Request } from "@/domain/requests/request";
import type { Task } from "@/domain/tasks/task";
import type { TaskEvent } from "@/domain/tasks/task-event";
import { createDrizzleBoardRepository } from "./drizzle-board-repository";
import { createDrizzleEventLog } from "./drizzle-event-log";
import { createDrizzleRequestRepository } from "./drizzle-request-repository";
import { createDrizzleSettingsRepository } from "./drizzle-settings-repository";
import { createDrizzleTaskRepository } from "./drizzle-task-repository";
import { openTestDatabase, resetTestDatabase } from "./test-support";
import type { Database } from "./client";

const clock = { now: () => "2026-11-23T10:00:00.000Z" };
const request: Request = { id: "request-1", title: "Landing", description: "<p>x</p>" };

const taskOf = (id: string, status: Task["status"] = "definition"): Task => ({
  id,
  requestId: request.id,
  title: id,
  description: "",
  status,
  assignedAgent: null,
  attempts: 0,
  lastFeedback: null,
  reviewReason: null,

  parentTaskId: null,
});

const transitionEvent = (taskId: string, from: Task["status"], to: Task["status"]): TaskEvent => ({
  taskId,
  from,
  to,
  actor: "system",
  reason: `Moved from ${from} to ${to}`,
});

let db: Database;

beforeAll(async () => {
  db = await openTestDatabase();
});

beforeEach(async () => {
  await resetTestDatabase(db);
});

afterAll(async () => {
  await db.$client.end();
});

describe("drizzle request repository", () => {
  it("saves a request with its tasks and updates only title and description on the next save", async () => {
    const repository = createDrizzleRequestRepository(db);
    const tasks = createDrizzleTaskRepository(db);

    await repository.saveWithTasks(request, [taskOf("t1")]);
    await repository.saveWithTasks({ ...request, title: "Renamed" }, [{ ...taskOf("t1"), title: "Renamed" }]);

    expect(await repository.list()).toEqual([{ ...request, title: "Renamed" }]);
    expect((await tasks.list()).map((task) => [task.id, task.title])).toEqual([["t1", "Renamed"]]);
  });

  it("removes a request and its tasks when every task is in an allowed status", async () => {
    const repository = createDrizzleRequestRepository(db);
    const tasks = createDrizzleTaskRepository(db);
    await repository.saveWithTasks(request, [taskOf("t1"), taskOf("t2", "review")]);

    const outcome = await repository.removeWithTasksIfStatuses(request.id, ["definition", "review"]);

    expect(outcome).toBe("applied");
    expect(await repository.list()).toEqual([]);
    expect(await tasks.list()).toEqual([]);
  });

  it("updates the request and its tasks only while every task is in an allowed status", async () => {
    const repository = createDrizzleRequestRepository(db);
    const tasks = createDrizzleTaskRepository(db);
    await repository.saveWithTasks(request, [taskOf("t1")]);

    const outcome = await repository.updateWithTasksIfStatuses(
      { ...request, title: "Renamed" },
      [{ ...taskOf("t1"), title: "Renamed" }],
      ["definition"],
    );

    expect(outcome).toBe("applied");
    expect(await repository.list()).toEqual([{ ...request, title: "Renamed" }]);
    expect((await tasks.list()).map((task) => task.title)).toEqual(["Renamed"]);
  });

  it("leaves the request and its tasks untouched when a task is outside the allowed statuses", async () => {
    const repository = createDrizzleRequestRepository(db);
    const tasks = createDrizzleTaskRepository(db);
    await repository.saveWithTasks(request, [taskOf("t1"), taskOf("t2", "ready")]);

    const outcome = await repository.updateWithTasksIfStatuses(
      { ...request, title: "Renamed" },
      [taskOf("t1"), taskOf("t2", "ready")].map((task) => ({ ...task, title: "Renamed" })),
      ["definition"],
    );

    expect(outcome).toBe("conflict");
    expect(await repository.list()).toEqual([request]);
    expect((await tasks.list()).map((task) => task.title)).toEqual(["t1", "t2"]);
  });

  it("keeps the request and its tasks when one task is outside the allowed statuses", async () => {
    const repository = createDrizzleRequestRepository(db);
    const tasks = createDrizzleTaskRepository(db);
    await repository.saveWithTasks(request, [taskOf("t1"), taskOf("t2", "ready")]);

    const outcome = await repository.removeWithTasksIfStatuses(request.id, ["definition", "review"]);

    expect(outcome).toBe("conflict");
    expect(await repository.list()).toEqual([request]);
    expect((await tasks.list()).map((task) => task.id)).toEqual(["t1", "t2"]);
  });
});

describe("drizzle task repository", () => {
  it("lists tasks in the order they were first stored", async () => {
    const requests = createDrizzleRequestRepository(db);
    const tasks = createDrizzleTaskRepository(db);

    await requests.saveWithTasks(request, [taskOf("t2"), taskOf("t1")]);

    expect((await tasks.list()).map((task) => task.id)).toEqual(["t2", "t1"]);
  });

  it("applies a transition when the stored status matches the expected status", async () => {
    const requests = createDrizzleRequestRepository(db);
    const tasks = createDrizzleTaskRepository(db);
    await requests.saveWithTasks(request, [taskOf("t1", "ready")]);

    const outcome = await tasks.applyTransition({
      task: taskOf("t1", "in_progress"),
      expectedStatus: "ready",
      event: transitionEvent("t1", "ready", "in_progress"),
    });

    expect(outcome).toBe("applied");
    expect((await tasks.list()).map((task) => task.status)).toEqual(["in_progress"]);
  });

  it("reports a conflict when the stored status differs from the expected status", async () => {
    const requests = createDrizzleRequestRepository(db);
    const tasks = createDrizzleTaskRepository(db);
    await requests.saveWithTasks(request, [taskOf("t1", "qa")]);

    const outcome = await tasks.applyTransition({
      task: taskOf("t1", "deploy"),
      expectedStatus: "ready",
      event: transitionEvent("t1", "ready", "deploy"),
    });

    expect(outcome).toBe("conflict");
    expect((await tasks.list()).map((task) => task.status)).toEqual(["qa"]);
  });

  it("lets only one of two concurrent claims move the same ready task", async () => {
    const requests = createDrizzleRequestRepository(db);
    const tasks = createDrizzleTaskRepository(db);
    await requests.saveWithTasks(request, [taskOf("t1", "ready")]);
    const claim = {
      task: taskOf("t1", "in_progress"),
      expectedStatus: "ready" as const,
      event: transitionEvent("t1", "ready", "in_progress"),
    };

    const outcomes = await Promise.all([tasks.applyTransition(claim), tasks.applyTransition(claim)]);

    expect(outcomes.sort()).toEqual(["applied", "conflict"]);
  });

  it("maps a second in-progress task to a conflict through the unique partial index", async () => {
    const requests = createDrizzleRequestRepository(db);
    const tasks = createDrizzleTaskRepository(db);
    await requests.saveWithTasks(request, [taskOf("t1", "in_progress"), taskOf("t2", "ready")]);

    const outcome = await tasks.applyTransition({
      task: taskOf("t2", "in_progress"),
      expectedStatus: "ready",
      event: transitionEvent("t2", "ready", "in_progress"),
    });

    expect(outcome).toBe("conflict");
    expect((await tasks.list()).map((task) => [task.id, task.status])).toEqual([
      ["t1", "in_progress"],
      ["t2", "ready"],
    ]);
  });

  it("rolls the task change back when the event cannot be recorded", async () => {
    const requests = createDrizzleRequestRepository(db);
    const tasks = createDrizzleTaskRepository(db);
    await requests.saveWithTasks(request, [taskOf("t1", "ready")]);
    const invalidEvent: TaskEvent = { ...transitionEvent("t1", "ready", "in_progress"), actor: "impostors" as TaskEvent["actor"] };

    await expect(
      tasks.applyTransition({ task: taskOf("t1", "in_progress"), expectedStatus: "ready", event: invalidEvent }),
    ).rejects.toThrow();

    expect((await tasks.list()).map((task) => task.status)).toEqual(["ready"]);
  });

  it("lets several subtasks of the same request be in progress together", async () => {
    const requests = createDrizzleRequestRepository(db);
    const tasks = createDrizzleTaskRepository(db);
    const parent = { ...taskOf("t1", "in_progress") };
    const subtaskOf = (id: string) => ({ ...taskOf(id, "in_progress"), parentTaskId: parent.id });

    await requests.saveWithTasks(request, [parent, subtaskOf("s1"), subtaskOf("s2")]);

    expect((await tasks.list()).filter((task) => task.status === "in_progress").map((task) => task.id)).toEqual([
      "t1",
      "s1",
      "s2",
    ]);
  });

  it("refuses a second request in progress while the first one is still running", async () => {
    const requests = createDrizzleRequestRepository(db);
    const tasks = createDrizzleTaskRepository(db);
    await requests.saveWithTasks(request, [taskOf("t1", "in_progress"), taskOf("t2", "ready")]);

    const outcome = await tasks.applyTransition({
      task: taskOf("t2", "in_progress"),
      expectedStatus: "ready",
      event: transitionEvent("t2", "ready", "in_progress"),
    });

    expect(outcome).toBe("conflict");
  });

  it("removes a task only while its stored status is allowed", async () => {
    const requests = createDrizzleRequestRepository(db);
    const tasks = createDrizzleTaskRepository(db);
    await requests.saveWithTasks(request, [taskOf("t1", "ready"), taskOf("t2", "definition")]);

    expect(await tasks.removeIfStatus("t1", ["definition", "review"])).toBe("conflict");
    expect(await tasks.removeIfStatus("t2", ["definition", "review"])).toBe("applied");
    expect((await tasks.list()).map((task) => task.id)).toEqual(["t1"]);
  });
});

describe("drizzle board repository", () => {
  const board = { id: "board-1", name: "Shop", rootPath: "C:\\Projects\\shop" };

  it("saves a board and lists it back", async () => {
    const repository = createDrizzleBoardRepository(db);

    await repository.save(board);

    expect(await repository.list()).toEqual([board]);
  });

  it("renames an existing board when saved again", async () => {
    const repository = createDrizzleBoardRepository(db);
    await repository.save(board);

    await repository.save({ ...board, name: "Shop v2" });

    expect(await repository.list()).toEqual([{ ...board, name: "Shop v2" }]);
  });

  it("refuses a second board that points at the same project folder", async () => {
    const repository = createDrizzleBoardRepository(db);
    await repository.save(board);

    const outcome = await repository.save({ ...board, id: "board-2", name: "Copy" });

    expect(outcome).toBe("conflict");
    expect(await repository.list()).toEqual([board]);
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
