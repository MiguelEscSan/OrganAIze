import type { Request } from "@/domain/requests/request";
import { normalizeRequestDetails } from "@/domain/requests/request";
import type { Task } from "@/domain/tasks/task";
import type { ApplicationDependencies } from "../shared/dependencies";
import { fail, succeed, type Outcome } from "../shared/outcome";

export type CreateRequest = {
  kind: "CreateRequest";
  boardId: string;
  title: string;
  description: string;
};

export type CreatedRequest = { request: Request; task: Task };

export const createRequest =
  (deps: ApplicationDependencies) =>
  async (command: CreateRequest): Promise<Outcome<CreatedRequest>> => {
    if (command.boardId.trim().length === 0) {
      return fail("A request needs a board");
    }

    const normalized = normalizeRequestDetails(command);

    if (!normalized.ok) {
      return fail(normalized.reason);
    }

    const { title, description } = normalized.details;
    const request: Request = { id: deps.ids.next(), boardId: command.boardId, title, description };
    const task: Task = {
      id: deps.ids.next(),
      requestId: request.id,
      title,
      description,
      acceptanceCriteria: [],
      files: [],
      status: "definition",
      assignedAgent: null,
      attempts: 0,
      lastFeedback: null,
      reviewReason: null,
      parentTaskId: null,
    };

    await deps.requests.saveWithTasks(request, [task]);

    return succeed({ request, task });
  };
