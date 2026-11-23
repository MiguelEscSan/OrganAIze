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

export const exceedsBudget = (usage: RunUsage, budget: Budget): boolean =>
  usage.minutes > budget.maxMinutes || usage.tokens > budget.maxTokens;

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
