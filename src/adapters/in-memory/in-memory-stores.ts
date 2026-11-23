import type { Request } from "@/domain/requests/request";
import type { Task } from "@/domain/tasks/task";
import type { TaskEvent } from "@/domain/tasks/task-event";
import type { TaskStatus } from "@/domain/tasks/task-status";
import type { Clock } from "@/ports/clock";
import type { EventLog, RecordedTaskEvent } from "@/ports/event-log";
import type { IdGenerator } from "@/ports/id-generator";
import type { RequestRepository } from "@/ports/request-repository";
import type { TaskRepository, TransitionWrite, WriteOutcome } from "@/ports/task-repository";

export type InMemoryState = {
  requests: Request[];
  tasks: Task[];
  events: RecordedTaskEvent[];
};

export const createInMemoryState = (seed: { requests?: readonly Request[]; tasks?: readonly Task[] }): InMemoryState => ({
  requests: [...(seed.requests ?? [])],
  tasks: [...(seed.tasks ?? [])],
  events: [],
});

const withoutTaskIds = (tasks: Task[], removed: readonly string[]): Task[] =>
  tasks.filter((task) => !removed.includes(task.id));

export const createInMemoryRequestRepository = (state: InMemoryState): RequestRepository => ({
  list: async () => [...state.requests],

  saveWithTasks: async (request, tasks) => {
    const exists = state.requests.some((candidate) => candidate.id === request.id);
    state.requests = exists
      ? state.requests.map((candidate) => (candidate.id === request.id ? request : candidate))
      : [...state.requests, request];

    const incoming = new Map(tasks.map((task) => [task.id, task]));
    state.tasks = [
      ...state.tasks.map((task) => {
        const next = incoming.get(task.id);
        return next ? { ...task, title: next.title, description: next.description } : task;
      }),
      ...tasks.filter((task) => !state.tasks.some((existing) => existing.id === task.id)),
    ];
  },

  updateWithTasksIfStatuses: async (request, tasks, allowedStatuses) => {
    const own = state.tasks.filter((task) => task.requestId === request.id);

    if (own.some((task) => !allowedStatuses.includes(task.status))) {
      return "conflict";
    }

    await createInMemoryRequestRepository(state).saveWithTasks(request, tasks);

    return "applied";
  },

  removeWithTasksIfStatuses: async (requestId, allowedStatuses) => {
    const own = state.tasks.filter((task) => task.requestId === requestId);

    if (own.some((task) => !allowedStatuses.includes(task.status))) {
      return "conflict";
    }

    state.requests = state.requests.filter((request) => request.id !== requestId);
    state.tasks = withoutTaskIds(state.tasks, own.map((task) => task.id));

    return "applied";
  },
});

export const createInMemoryTaskRepository = (state: InMemoryState, clock: Clock): TaskRepository => ({
  list: async () => [...state.tasks],

  applyTransition: async ({ task, expectedStatus, event }: TransitionWrite): Promise<WriteOutcome> => {
    const current = state.tasks.find((candidate) => candidate.id === task.id);

    if (!current || current.status !== expectedStatus) {
      return "conflict";
    }

    const requestRunningElsewhere = state.tasks.some(
      (candidate) => candidate.id !== task.id && candidate.parentTaskId === null && candidate.status === "in_progress",
    );

    if (task.status === "in_progress" && task.parentTaskId === null && requestRunningElsewhere) {
      return "conflict";
    }

    state.tasks = state.tasks.map((candidate) => (candidate.id === task.id ? task : candidate));
    state.events.push({ ...event, at: clock.now() });

    return "applied";
  },

  removeIfStatus: async (taskId: string, allowedStatuses: readonly TaskStatus[]): Promise<WriteOutcome> => {
    const current = state.tasks.find((candidate) => candidate.id === taskId);

    if (!current || !allowedStatuses.includes(current.status)) {
      return "conflict";
    }

    state.tasks = withoutTaskIds(state.tasks, [taskId]);

    return "applied";
  },
});

export const createInMemoryEventLog = (state: InMemoryState, clock: Clock): EventLog => ({
  append: async (event: TaskEvent) => {
    state.events.push({ ...event, at: clock.now() });
  },
  list: async () => [...state.events],
});

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
