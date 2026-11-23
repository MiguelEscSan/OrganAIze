import type { AppSettings } from "@/domain/settings/app-settings";
import type { ApplicationDependencies } from "../shared/dependencies";

export type GetSettings = { kind: "GetSettings" };

export const getSettings =
  (deps: ApplicationDependencies) =>
  async (): Promise<AppSettings> =>
    deps.settings.get();
