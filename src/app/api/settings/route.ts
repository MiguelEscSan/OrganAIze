import { connection } from "next/server";
import { getAppServices } from "@/adapters/server/app-services";
import { failedServer, readJsonObject, refused, succeeded } from "@/adapters/server/json-responses";
import type { Outcome } from "@/application/shared/outcome";
import type { AppSettings } from "@/domain/settings/app-settings";

const settingsFields = ["maxAttempts", "maxMinutes", "maxTokens", "maxQaTasks"] as const;

const readSettings = (body: Record<string, unknown>): AppSettings | null => {
  const numbers = settingsFields.map((field) => body[field]);

  if (!numbers.every((value) => typeof value === "number")) {
    return null;
  }

  return {
    maxAttempts: body.maxAttempts as number,
    maxMinutes: body.maxMinutes as number,
    maxTokens: body.maxTokens as number,
    maxQaTasks: body.maxQaTasks as number,
  };
};

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

  const settings = readSettings(body);

  if (!settings) {
    return refused("Every setting must be a number");
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
