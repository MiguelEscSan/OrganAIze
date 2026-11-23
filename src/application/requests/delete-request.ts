import type { ApplicationDependencies } from "../shared/dependencies";
import { fail, succeed, type Outcome } from "../shared/outcome";
import { tasksOfRequest } from "./request-tasks";

export type DeleteRequest = {
  kind: "DeleteRequest";
  requestId: string;
};

const deletableStatuses = ["definition", "review"] as const;

export const deleteRequest =
  (deps: ApplicationDependencies) =>
  async (command: DeleteRequest): Promise<Outcome<void>> => {
    const requests = await deps.requests.list();

    if (!requests.some((candidate) => candidate.id === command.requestId)) {
      return fail("Request not found");
    }

    const tasks = await deps.tasks.list();
    const own = tasksOfRequest(tasks, command.requestId);

    if (own.some((task) => !deletableStatuses.some((status) => status === task.status))) {
      return fail("Only requests whose tasks are all in definition or review can be deleted");
    }

    const outcome = await deps.requests.removeWithTasksIfStatuses(command.requestId, deletableStatuses);

    if (outcome === "conflict") {
      return fail("Only requests whose tasks are all in definition or review can be deleted");
    }

    return succeed(undefined);
  };
