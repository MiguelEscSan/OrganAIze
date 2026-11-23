export type OrchestrationFailureExplanation = {
  title: string;
  reason: string;
  detail: string;
};

const statusPattern = /status (\d{3})/;

const httpStatusOf = (feedback: string): number | null => {
  const match = statusPattern.exec(feedback);
  return match ? Number(match[1]) : null;
};

const explainHttpStatus = (status: number, feedback: string): OrchestrationFailureExplanation | null => {
  if (status === 401 || status === 403) {
    return {
      title: "The Gemini key was rejected",
      reason: "Check LLM_API_KEY in .env.local: the key is invalid, revoked, or has no access.",
      detail: feedback,
    };
  }

  if (status === 404) {
    return {
      title: "The Gemini model was not found",
      reason: "Check LLM_MODEL in .env.local. Use a model name without the models/ prefix.",
      detail: feedback,
    };
  }

  if (status === 429) {
    return {
      title: "Gemini rate limit reached",
      reason: "Too many requests. Wait a few minutes and send the task to Ready again.",
      detail: feedback,
    };
  }

  if (status >= 500 && status <= 599) {
    return {
      title: "Gemini is overloaded",
      reason: "The model is busy right now. This is temporary: wait a few minutes and send the task to Ready again.",
      detail: feedback,
    };
  }

  return null;
};

const explainMissingSetting = (feedback: string): OrchestrationFailureExplanation | null => {
  if (feedback === "LLM_MODEL is not set") {
    return {
      title: "LLM_MODEL is not set",
      reason: "Add LLM_MODEL to .env.local and restart the server.",
      detail: feedback,
    };
  }

  if (feedback === "LLM_API_KEY is not set") {
    return {
      title: "LLM_API_KEY is not set",
      reason: "Add LLM_API_KEY to .env.local and restart the server.",
      detail: feedback,
    };
  }

  return null;
};

const genericFailure = (feedback: string): OrchestrationFailureExplanation => ({
  title: "The orchestrator failed",
  reason: "The agent could not finish the request. See the details.",
  detail: feedback,
});

export const explainOrchestrationFailure = (feedback: string): OrchestrationFailureExplanation => {
  const status = httpStatusOf(feedback);

  const byStatus = status === null ? null : explainHttpStatus(status, feedback);

  return byStatus ?? explainMissingSetting(feedback) ?? genericFailure(feedback);
};
