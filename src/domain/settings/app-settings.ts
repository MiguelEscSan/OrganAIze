export type AppSettings = {
  maxAttempts: number;
  maxMinutes: number;
  maxTokens: number;
  maxQaTasks: number;
};

export const defaultAppSettings: AppSettings = {
  maxAttempts: 3,
  maxMinutes: 15,
  maxTokens: 50_000,
  maxQaTasks: 2,
};

export type SettingsValidation = { ok: true; settings: AppSettings } | { ok: false; reason: string };

const isWholeNumberIn = (value: number, min: number, max: number): boolean =>
  Number.isInteger(value) && value >= min && value <= max;

export const validateAppSettings = (settings: AppSettings): SettingsValidation => {
  if (!isWholeNumberIn(settings.maxAttempts, 1, 10)) {
    return { ok: false, reason: "Attempts must be a whole number between 1 and 10" };
  }

  if (!isWholeNumberIn(settings.maxMinutes, 1, 240)) {
    return { ok: false, reason: "Time budget must be a whole number of minutes between 1 and 240" };
  }

  if (!isWholeNumberIn(settings.maxTokens, 1_000, 1_000_000)) {
    return { ok: false, reason: "Token budget must be a whole number between 1000 and 1000000" };
  }

  if (!isWholeNumberIn(settings.maxQaTasks, 1, 10)) {
    return { ok: false, reason: "QA capacity must be a whole number between 1 and 10" };
  }

  return { ok: true, settings };
};
