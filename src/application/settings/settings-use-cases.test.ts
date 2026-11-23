import { describe, expect, it } from "vitest";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import { defaultAppSettings } from "@/domain/settings/app-settings";
import { getSettings } from "./get-settings";
import { updateSettings } from "./update-settings";

describe("getSettings", () => {
  it("returns the defaults when nothing was saved", async () => {
    const deps = createInMemoryDependencies();

    expect(await getSettings(deps)()).toEqual(defaultAppSettings);
  });

  it("returns the settings saved last", async () => {
    const deps = createInMemoryDependencies();
    await updateSettings(deps)({ kind: "UpdateSettings", settings: { ...defaultAppSettings, maxMinutes: 30 } });

    expect((await getSettings(deps)()).maxMinutes).toBe(30);
  });
});

describe("updateSettings", () => {
  it("saves valid settings and returns them", async () => {
    const deps = createInMemoryDependencies();
    const next = { maxAttempts: 5, maxMinutes: 20, maxTokens: 80_000, maxQaTasks: 3 };

    const outcome = await updateSettings(deps)({ kind: "UpdateSettings", settings: next });

    expect(outcome).toEqual({ ok: true, value: next });
    expect(await deps.settings.get()).toEqual(next);
  });

  it("refuses invalid settings and keeps the previous ones", async () => {
    const deps = createInMemoryDependencies();

    const outcome = await updateSettings(deps)({
      kind: "UpdateSettings",
      settings: { ...defaultAppSettings, maxAttempts: 0 },
    });

    expect(outcome).toEqual({ ok: false, reason: "Attempts must be a whole number between 1 and 10" });
    expect(await deps.settings.get()).toEqual(defaultAppSettings);
  });
});
