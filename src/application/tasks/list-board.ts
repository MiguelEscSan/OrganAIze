import { groupTasksByStatus, type TasksByStatus } from "@/domain/tasks/group-tasks-by-status";
import type { ApplicationDependencies } from "../shared/dependencies";

export type ListBoard = { kind: "ListBoard" };

export const listBoard =
  (deps: ApplicationDependencies) =>
  async (): Promise<TasksByStatus> =>
    groupTasksByStatus(await deps.tasks.list());
