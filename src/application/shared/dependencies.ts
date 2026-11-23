import type { Clock } from "@/ports/clock";
import type { EventLog } from "@/ports/event-log";
import type { IdGenerator } from "@/ports/id-generator";
import type { SettingsRepository } from "@/ports/settings-repository";
import type { RequestRepository } from "@/ports/request-repository";
import type { TaskRepository } from "@/ports/task-repository";

export type ApplicationDependencies = {
  requests: RequestRepository;
  tasks: TaskRepository;
  settings: SettingsRepository;
  events: EventLog;
  ids: IdGenerator;
  clock: Clock;
};
