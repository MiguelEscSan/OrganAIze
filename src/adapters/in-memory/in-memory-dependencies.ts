import type { Request } from "@/domain/requests/request";
import type { Task } from "@/domain/tasks/task";
import type { ApplicationDependencies } from "@/application/shared/dependencies";
import { createInMemorySettingsRepository } from "./in-memory-settings-repository";
import {
  createFixedClock,
  createInMemoryEventLog,
  createInMemoryRequestRepository,
  createInMemoryState,
  createInMemoryTaskRepository,
  createSequentialIdGenerator,
} from "./in-memory-stores";

type Seed = {
  requests?: readonly Request[];
  tasks?: readonly Task[];
};

export const createInMemoryDependencies = (seed: Seed = {}): ApplicationDependencies => {
  const clock = createFixedClock("2026-11-23T10:00:00.000Z");
  const state = createInMemoryState(seed);

  return {
    requests: createInMemoryRequestRepository(state),
    tasks: createInMemoryTaskRepository(state, clock),
    settings: createInMemorySettingsRepository(),
    events: createInMemoryEventLog(state, clock),
    ids: createSequentialIdGenerator("id"),
    clock,
  };
};
