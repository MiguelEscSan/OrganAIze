import type { Request } from "@/domain/requests/request";
import type { Task } from "@/domain/tasks/task";
import type { ApplicationDependencies } from "@/application/shared/dependencies";
import {
  createFixedClock,
  createInMemoryEventLog,
  createInMemoryRequestRepository,
  createInMemoryTaskRepository,
  createSequentialIdGenerator,
} from "./in-memory-stores";

type Seed = {
  requests?: readonly Request[];
  tasks?: readonly Task[];
};

export const createInMemoryDependencies = (seed: Seed = {}): ApplicationDependencies => {
  const clock = createFixedClock("2026-11-23T10:00:00.000Z");

  return {
    requests: createInMemoryRequestRepository(seed.requests),
    tasks: createInMemoryTaskRepository(seed.tasks),
    events: createInMemoryEventLog(clock),
    ids: createSequentialIdGenerator("id"),
    clock,
  };
};
