export const taskStatuses = ["definition", "ready", "in_progress", "qa", "awaiting_release", "deploy", "review"] as const;

export type TaskStatus = (typeof taskStatuses)[number];

export const maxAttemptsPerTask = 3;

export const maxMechanicalAttemptsPerTask = 6;
