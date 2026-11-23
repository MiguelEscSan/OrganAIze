import type { Request } from "@/domain/requests/request";
import type { Task } from "@/domain/tasks/task";
import type { TaskEvent } from "@/domain/tasks/task-event";
import type { Clock } from "@/ports/clock";
import type { EventLog, RecordedTaskEvent } from "@/ports/event-log";
import type { IdGenerator } from "@/ports/id-generator";
import type { RequestRepository } from "@/ports/request-repository";
import type { TaskRepository } from "@/ports/task-repository";

export const createInMemoryRequestRepository = (initial: readonly Request[] = []): RequestRepository => {
  let requests = [...initial];

  return {
    list: async () => [...requests],
    save: async (request) => {
      const exists = requests.some((candidate) => candidate.id === request.id);
      requests = exists
        ? requests.map((candidate) => (candidate.id === request.id ? request : candidate))
        : [...requests, request];
    },
    remove: async (requestId) => {
      requests = requests.filter((candidate) => candidate.id !== requestId);
    },
  };
};

export const createInMemoryTaskRepository = (initial: readonly Task[] = []): TaskRepository => {
  let tasks = [...initial];

  return {
    list: async () => [...tasks],
    replaceAll: async (next) => {
      tasks = [...next];
    },
  };
};

export const createInMemoryEventLog = (clock: Clock): EventLog => {
  const events: RecordedTaskEvent[] = [];

  return {
    append: async (event: TaskEvent) => {
      events.push({ ...event, at: clock.now() });
    },
    list: async () => [...events],
  };
};

export const createSequentialIdGenerator = (prefix: string): IdGenerator => {
  let counter = 0;

  return {
    next: () => {
      counter += 1;
      return `${prefix}-${counter}`;
    },
  };
};

export const createFixedClock = (instant: string): Clock => ({
  now: () => instant,
});
