import type { ReviewDecisionKind } from "@/application/tasks/review-decision";
import type { AppSettings } from "@/domain/settings/app-settings";

export type RequestText = { title: string; description: string };

export const parseRequestText = (body: Record<string, unknown>): RequestText | null =>
  typeof body.title === "string" && typeof body.description === "string"
    ? { title: body.title, description: body.description }
    : null;

const isOptionalText = (value: unknown): boolean => value === undefined || typeof value === "string";

export const hasOptionalRequestText = (body: Record<string, unknown>): boolean =>
  isOptionalText(body.title) && isOptionalText(body.description);

const reviewDecisions: readonly ReviewDecisionKind[] = ["continue", "send_to_ready", "delete"];

export const parseReviewDecision = (value: unknown): ReviewDecisionKind | null =>
  reviewDecisions.find((decision) => decision === value) ?? null;

const numberOf = (value: unknown): number | null => (typeof value === "number" ? value : null);

export const parseSettingsBody = (body: Record<string, unknown>): AppSettings | null => {
  const maxAttempts = numberOf(body.maxAttempts);
  const maxMinutes = numberOf(body.maxMinutes);
  const maxTokens = numberOf(body.maxTokens);
  const maxQaTasks = numberOf(body.maxQaTasks);

  if (
    typeof body.teamName !== "string" ||
    typeof body.autoRefresh !== "boolean" ||
    maxAttempts === null ||
    maxMinutes === null ||
    maxTokens === null ||
    maxQaTasks === null
  ) {
    return null;
  }

  return {
    teamName: body.teamName,
    autoRefresh: body.autoRefresh,
    maxAttempts,
    maxMinutes,
    maxTokens,
    maxQaTasks,
  };
};
