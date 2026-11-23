import { describe, expect, it } from "vitest";
import { defaultAppSettings, validateAppSettings } from "./app-settings";

describe("validateAppSettings", () => {
  it("accepts the defaults from the plan", () => {
    expect(validateAppSettings(defaultAppSettings)).toEqual({ ok: true, settings: defaultAppSettings });
  });

  it("refuses an attempt limit outside 1 to 10", () => {
    expect(validateAppSettings({ ...defaultAppSettings, maxAttempts: 0 })).toEqual({
      ok: false,
      reason: "Attempts must be a whole number between 1 and 10",
    });
    expect(validateAppSettings({ ...defaultAppSettings, maxAttempts: 2.5 }).ok).toBe(false);
  });

  it("refuses a time budget outside 1 to 240 minutes", () => {
    expect(validateAppSettings({ ...defaultAppSettings, maxMinutes: 241 }).ok).toBe(false);
  });

  it("refuses a token budget outside 1000 to 1000000", () => {
    expect(validateAppSettings({ ...defaultAppSettings, maxTokens: 999 }).ok).toBe(false);
    expect(validateAppSettings({ ...defaultAppSettings, maxTokens: 1_000_001 }).ok).toBe(false);
  });

  it("refuses a blank team name or one longer than 40 characters", () => {
    expect(validateAppSettings({ ...defaultAppSettings, teamName: "   " })).toEqual({
      ok: false,
      reason: "Team name must be between 1 and 40 characters",
    });
    expect(validateAppSettings({ ...defaultAppSettings, teamName: "x".repeat(41) }).ok).toBe(false);
  });

  it("refuses a QA capacity outside 1 to 10 tasks", () => {
    expect(validateAppSettings({ ...defaultAppSettings, maxQaTasks: 0 })).toEqual({
      ok: false,
      reason: "QA capacity must be a whole number between 1 and 10",
    });
    expect(validateAppSettings({ ...defaultAppSettings, maxQaTasks: 11 }).ok).toBe(false);
  });
});
