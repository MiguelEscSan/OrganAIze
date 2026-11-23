export const actors = ["user", "system"] as const;

export type Actor = (typeof actors)[number];
