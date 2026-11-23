import { randomUUID } from "node:crypto";
import type { ApplicationDependencies } from "@/application/shared/dependencies";
import type { Clock } from "@/ports/clock";
import type { Database } from "./client";
import { createDrizzleEventLog } from "./drizzle-event-log";
import { createDrizzleRequestRepository } from "./drizzle-request-repository";
import { createDrizzleSettingsRepository } from "./drizzle-settings-repository";
import { createDrizzleTaskRepository } from "./drizzle-task-repository";

export const systemClock: Clock = { now: () => new Date().toISOString() };

export const createDrizzleDependencies = (db: Database): ApplicationDependencies => ({
  requests: createDrizzleRequestRepository(db),
  tasks: createDrizzleTaskRepository(db),
  settings: createDrizzleSettingsRepository(db),
  events: createDrizzleEventLog(db, systemClock),
  ids: { next: () => randomUUID() },
  clock: systemClock,
});
