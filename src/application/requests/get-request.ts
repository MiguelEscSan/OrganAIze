import type { Request } from "@/domain/requests/request";
import type { Task } from "@/domain/tasks/task";
import type { ApplicationDependencies } from "../shared/dependencies";
import { fail, succeed, type Outcome } from "../shared/outcome";
import { tasksOfRequest } from "./request-tasks";

export type GetRequest = { kind: "GetRequest"; requestId: string };

export type RequestDetail = { request: Request; tasks: Task[] };

export const getRequest =
  (deps: ApplicationDependencies) =>
  async (query: GetRequest): Promise<Outcome<RequestDetail>> => {
    const request = (await deps.requests.list()).find((candidate) => candidate.id === query.requestId);

    if (!request) {
      return fail("Request not found");
    }

    return succeed({ request, tasks: tasksOfRequest(await deps.tasks.list(), request.id) });
  };
