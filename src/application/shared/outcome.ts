export type Outcome<T> = { ok: true; value: T } | { ok: false; reason: string };

export const succeed = <T>(value: T): Outcome<T> => ({ ok: true, value });

export const fail = <T = never>(reason: string): Outcome<T> => ({ ok: false, reason });
