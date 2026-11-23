import type { Request } from "@/domain/requests/request";
import type { ApplicationDependencies } from "../shared/dependencies";
import { tasksOfRequest } from "./request-tasks";

export type ListRequests = { kind: "ListRequests" };

export type RequestSummary = {
  request: Request;
  total: number;
  deployed: number;
};

export const listRequests =
  (deps: ApplicationDependencies) =>
  async (): Promise<RequestSummary[]> => {
    const requests = await deps.requests.list();
    const tasks = await deps.tasks.list();

    return requests.map((request) => {
      const own = tasksOfRequest(tasks, request.id);

      return {
        request,
        total: own.length,
        deployed: own.filter((task) => task.status === "deploy").length,
      };
    });
  };
