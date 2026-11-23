import type { Request } from "@/domain/requests/request";
import { normalizeRequestDetails } from "@/domain/requests/request";
import type { ApplicationDependencies } from "../shared/dependencies";
import { fail, succeed, type Outcome } from "../shared/outcome";
import { tasksOfRequest } from "./request-tasks";

export type EditRequest = {
  kind: "EditRequest";
  requestId: string;
  title: string;
  description: string;
};

export const editRequest =
  (deps: ApplicationDependencies) =>
  async (command: EditRequest): Promise<Outcome<Request>> => {
    const requests = await deps.requests.list();
    const current = requests.find((candidate) => candidate.id === command.requestId);

    if (!current) {
      return fail("Request not found");
    }

    const tasks = await deps.tasks.list();
    const own = tasksOfRequest(tasks, current.id);

    if (own.some((task) => task.status !== "definition")) {
      return fail("Only requests whose tasks are all in definition can be edited");
    }

    const normalized = normalizeRequestDetails(command);

    if (!normalized.ok) {
      return fail(normalized.reason);
    }

    const { title, description } = normalized.details;
    const updated: Request = { ...current, title, description };

    const outcome = await deps.requests.updateWithTasksIfStatuses(
      updated,
      own.map((task) => ({ ...task, title, description })),
      ["definition"],
    );

    if (outcome === "conflict") {
      return fail("Only requests whose tasks are all in definition can be edited");
    }

    return succeed(updated);
  };
