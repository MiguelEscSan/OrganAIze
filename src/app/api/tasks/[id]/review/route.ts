import { getAppServices } from "@/adapters/server/app-services";
import { failedServer, readJsonObject, refused, succeeded } from "@/adapters/server/json-responses";
import type { Outcome } from "@/application/shared/outcome";
import type { ReviewDecisionKind } from "@/application/tasks/review-decision";
import type { Task } from "@/domain/tasks/task";

type ReviewRouteContext = { params: Promise<{ id: string }> };

const reviewDecisions: readonly ReviewDecisionKind[] = ["continue", "delete"];

const isReviewDecision = (value: unknown): value is ReviewDecisionKind =>
  reviewDecisions.some((decision) => decision === value);

export const POST = async (request: Request, context: ReviewRouteContext): Promise<Response> => {
  const body = await readJsonObject(request);

  if (!body) {
    return refused("The request body must be a JSON object");
  }

  if (!isReviewDecision(body.decision)) {
    return refused("The decision must be continue or delete");
  }

  try {
    const { id } = await context.params;
    const { mediator } = getAppServices();
    const outcome = await mediator.send<
      { kind: "DecideReview"; taskId: string; decision: ReviewDecisionKind },
      Outcome<Task | null>
    >({ kind: "DecideReview", taskId: id, decision: body.decision });

    return outcome.ok ? succeeded({ task: outcome.value }) : refused(outcome.reason);
  } catch (error) {
    return failedServer(error);
  }
};
