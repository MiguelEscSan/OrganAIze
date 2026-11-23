import { defaultAppSettings, type AppSettings } from "@/domain/settings/app-settings";
import type { SettingsRepository } from "@/ports/settings-repository";

export const createInMemorySettingsRepository = (initial: AppSettings = defaultAppSettings): SettingsRepository => {
  let current = initial;

  return {
    get: async () => current,
    save: async (settings) => {
      current = settings;
    },
  };
};
