export const taskStatuses = ["definition", "ready", "in_progress", "qa", "deploy"] as const;

export type TaskStatus = (typeof taskStatuses)[number];
