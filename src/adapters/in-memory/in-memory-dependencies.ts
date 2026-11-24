import type { Request } from "@/domain/requests/request";
import type { Task } from "@/domain/tasks/task";
import type { Board } from "@/domain/boards/board";
import type { ApplicationDependencies, BoardDependencies } from "@/application/shared/dependencies";
import { createInMemoryAgentActivityRepository } from "./in-memory-agent-activity-repository";
import { createInMemoryBoardRepository } from "./in-memory-board-repository";
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
  boards?: readonly Board[];
  requests?: readonly Request[];
  tasks?: readonly Task[];
};

export const inMemoryAppRoot = "C:/projects/agent-team";

export const createInMemoryDependencies = (seed: Seed = {}): ApplicationDependencies & BoardDependencies => {
  const clock = createFixedClock("2026-11-23T10:00:00.000Z");
  const state = createInMemoryState(seed);

  return {
    requests: createInMemoryRequestRepository(state),
    tasks: createInMemoryTaskRepository(state, clock),
    settings: createInMemorySettingsRepository(),
    events: createInMemoryEventLog(state, clock),
    ids: createSequentialIdGenerator("id"),
    clock,
    activity: createInMemoryAgentActivityRepository(),
    boards: createInMemoryBoardRepository(seed.boards),
    appRoot: inMemoryAppRoot,
  };
};
