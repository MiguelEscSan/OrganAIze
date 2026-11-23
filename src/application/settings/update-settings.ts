import { validateAppSettings, type AppSettings } from "@/domain/settings/app-settings";
import type { ApplicationDependencies } from "../shared/dependencies";
import { fail, succeed, type Outcome } from "../shared/outcome";

export type UpdateSettings = {
  kind: "UpdateSettings";
  settings: AppSettings;
};

export const updateSettings =
  (deps: ApplicationDependencies) =>
  async (command: UpdateSettings): Promise<Outcome<AppSettings>> => {
    const validation = validateAppSettings(command.settings);

    if (!validation.ok) {
      return fail(validation.reason);
    }

    await deps.settings.save(validation.settings);

    return succeed(validation.settings);
  };
