import { defaultAppSettings, type AppSettings } from "@/domain/settings/app-settings";
import type { SettingsRepository } from "@/ports/settings-repository";
import type { Database } from "./client";
import { settings } from "./schema";

export const createDrizzleSettingsRepository = (db: Database): SettingsRepository => ({
  get: async (): Promise<AppSettings> => {
    const [row] = await db.select().from(settings);

    if (!row) {
      return defaultAppSettings;
    }

    return {
      teamName: row.teamName,
      autoRefresh: row.autoRefresh,
      maxAttempts: row.maxAttempts,
      maxMinutes: row.maxMinutes,
      maxTokens: row.maxTokens,
      maxQaTasks: row.maxQaTasks,
    };
  },

  save: async (value) => {
    await db
      .insert(settings)
      .values({ singleton: true, ...value })
      .onConflictDoUpdate({
        target: settings.singleton,
        set: {
          teamName: value.teamName,
          autoRefresh: value.autoRefresh,
          maxAttempts: value.maxAttempts,
          maxMinutes: value.maxMinutes,
          maxTokens: value.maxTokens,
          maxQaTasks: value.maxQaTasks,
        },
      });
  },
});
