export const taskStatuses = ["ready", "in_progress", "qa", "deploy"] as const;

export type TaskStatus = (typeof taskStatuses)[number];
