import type { AppSettings } from "@/domain/settings/app-settings";

export type SettingsRepository = {
  get(): Promise<AppSettings>;
  save(settings: AppSettings): Promise<void>;
};
