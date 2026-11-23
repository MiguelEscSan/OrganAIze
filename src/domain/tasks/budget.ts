import type { Task } from "./task";

export type RunUsage = {
  minutes: number;
  tokens: number;
};

export type Budget = {
  maxMinutes: number;
  maxTokens: number;
};

export type BudgetResult =
  | { ok: true; tasks: Task[] }
  | { ok: false; reason: string };

const MILLISECONDS_PER_MINUTE = 60_000;

export const minutesBetween = (startedAt: string, endedAt: string): number =>
  (Date.parse(endedAt) - Date.parse(startedAt)) / MILLISECONDS_PER_MINUTE;

export const budgetOverrunReason = (usage: RunUsage, budget: Budget): string | undefined => {
  if (usage.minutes > budget.maxMinutes) {
    return `Stopped after ${Math.floor(usage.minutes)} min, over the ${budget.maxMinutes} min budget`;
  }

  if (usage.tokens > budget.maxTokens) {
    return `Stopped after ${usage.tokens} tokens, over the ${budget.maxTokens} token budget`;
  }

  return undefined;
};

export const exceedsBudget = (usage: RunUsage, budget: Budget): boolean =>
  budgetOverrunReason(usage, budget) !== undefined;

export const stopForBudget = (
  tasks: readonly Task[],
  taskId: string,
  reason: string,
): BudgetResult => {
  const task = tasks.find((candidate) => candidate.id === taskId);

  if (!task) {
    return { ok: false, reason: "Task not found" };
  }

  if (task.status !== "in_progress") {
    return { ok: false, reason: "Only a running task can be stopped for budget" };
  }

  return {
    ok: true,
    tasks: tasks.map((candidate) =>
      candidate.id === taskId
        ? { ...candidate, status: "review", lastFeedback: reason.trim(), reviewReason: "budget" }
        : candidate,
    ),
  };
};
