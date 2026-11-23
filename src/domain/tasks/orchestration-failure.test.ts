import { describe, expect, it } from "vitest";
import { explainOrchestrationFailure } from "./orchestration-failure";

describe("explainOrchestrationFailure", () => {
  it("explains a rejected Gemini key for status 401", () => {
    const feedback = "Gemini request failed with status 401";
    expect(explainOrchestrationFailure(feedback)).toEqual({
      title: "The Gemini key was rejected",
      reason: "Check LLM_API_KEY in .env.local: the key is invalid, revoked, or has no access.",
      detail: feedback,
    });
  });

  it("explains a rejected Gemini key for status 403", () => {
    const feedback = "Gemini request failed with status 403";
    expect(explainOrchestrationFailure(feedback).title).toBe("The Gemini key was rejected");
  });

  it("explains a missing model for status 404", () => {
    const feedback = "Gemini request failed with status 404";
    expect(explainOrchestrationFailure(feedback)).toEqual({
      title: "The Gemini model was not found",
      reason: "Check LLM_MODEL in .env.local. Use a model name without the models/ prefix.",
      detail: feedback,
    });
  });

  it("explains the rate limit for status 429", () => {
    const feedback = "Gemini request failed with status 429";
    expect(explainOrchestrationFailure(feedback)).toEqual({
      title: "Gemini rate limit reached",
      reason: "Too many requests. Wait a few minutes and send the task to Ready again.",
      detail: feedback,
    });
  });

  it("explains an overloaded model for status 503", () => {
    const feedback = "Gemini request failed with status 503";
    expect(explainOrchestrationFailure(feedback)).toEqual({
      title: "Gemini is overloaded",
      reason: "The model is busy right now. This is temporary: wait a few minutes and send the task to Ready again.",
      detail: feedback,
    });
  });

  it("treats every 5xx status as an overloaded model", () => {
    expect(explainOrchestrationFailure("Gemini request failed with status 500").title).toBe("Gemini is overloaded");
    expect(explainOrchestrationFailure("Gemini request failed with status 599").title).toBe("Gemini is overloaded");
  });

  it("explains an unset model", () => {
    expect(explainOrchestrationFailure("LLM_MODEL is not set")).toEqual({
      title: "LLM_MODEL is not set",
      reason: "Add LLM_MODEL to .env.local and restart the server.",
      detail: "LLM_MODEL is not set",
    });
  });

  it("explains an unset API key", () => {
    expect(explainOrchestrationFailure("LLM_API_KEY is not set")).toEqual({
      title: "LLM_API_KEY is not set",
      reason: "Add LLM_API_KEY to .env.local and restart the server.",
      detail: "LLM_API_KEY is not set",
    });
  });

  it("falls back to a generic failure for any other feedback", () => {
    const feedback = "Gemini reply is not valid JSON";
    expect(explainOrchestrationFailure(feedback)).toEqual({
      title: "The orchestrator failed",
      reason: "The agent could not finish the request. See the details.",
      detail: feedback,
    });
  });
});
