import { connection } from "next/server";
import { getAppServices } from "@/adapters/server/app-services";
import { failedServer, readJsonObject, refused, succeeded } from "@/adapters/server/json-responses";
import { parseSettingsBody } from "@/adapters/server/request-body";
import type { Outcome } from "@/application/shared/outcome";
import type { AppSettings } from "@/domain/settings/app-settings";

export const GET = async (): Promise<Response> => {
  await connection();

  try {
    const { mediator } = getAppServices();
    const settings = await mediator.ask<{ kind: "GetSettings" }, AppSettings>({ kind: "GetSettings" });

    return succeeded({ settings });
  } catch (error) {
    return failedServer(error);
  }
};

export const PUT = async (request: Request): Promise<Response> => {
  const body = await readJsonObject(request);

  if (!body) {
    return refused("The request body must be a JSON object");
  }

  const settings = parseSettingsBody(body);

  if (!settings) {
    return refused("Every setting must have a valid value");
  }

  try {
    const { mediator } = getAppServices();
    const outcome = await mediator.send<{ kind: "UpdateSettings"; settings: AppSettings }, Outcome<AppSettings>>({
      kind: "UpdateSettings",
      settings,
    });

    return outcome.ok ? succeeded({ settings: outcome.value }) : refused(outcome.reason);
  } catch (error) {
    return failedServer(error);
  }
};
