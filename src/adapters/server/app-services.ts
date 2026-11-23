import type { Mediator } from "@/application/cqrs/mediator";
import { createMediator } from "@/application/register-handlers";
import { normalizeBoardDetails } from "@/domain/boards/board";
import type { BoardRepository } from "@/ports/board-repository";
import type { LlmClient } from "@/ports/llm-client";
import { createLlmClientFromEnv } from "../config/llm-client-from-env";
import { createDrizzleBoardRepository } from "../drizzle/drizzle-board-repository";
import { createDrizzleDependencies } from "../drizzle/create-drizzle-dependencies";
import { createDatabase } from "../drizzle/client";
import { createDiskWorkspaceWriter } from "../workspace/disk-workspace-writer";

export type AppServices = {
  mediator: Mediator;
  boards: BoardRepository;
};

const globalWithServices = globalThis as typeof globalThis & { agentTeamServices?: AppServices };

export const requiredEnv = (name: string): string => {
  const value = process.env[name]?.trim() ?? "";

  if (value.length === 0) {
    throw new Error(`${name} is not set`);
  }

  return value;
};

const unavailableLlm = (reason: string): LlmClient => ({
  generateJson: async () => ({ ok: false, reason }),
});

const llmFromEnvironment = (): LlmClient => {
  const outcome = createLlmClientFromEnv(process.env, (url, init) => fetch(url, init));

  return outcome.ok ? outcome.llm : unavailableLlm(outcome.reason);
};

const buildServices = (): AppServices => {
  const db = createDatabase(requiredEnv("DATABASE_URL"));

  return {
    mediator: createMediator({
      ...createDrizzleDependencies(db),
      llm: llmFromEnvironment(),
      boards: createDrizzleBoardRepository(db),
      workspaceFor: (rootPath) => createDiskWorkspaceWriter(rootPath),
    }),
    boards: createDrizzleBoardRepository(db),
  };
};

export const getAppServices = (): AppServices => {
  globalWithServices.agentTeamServices ??= buildServices();

  return globalWithServices.agentTeamServices;
};

const defaultBoardId = "default-board";

export const resolveDefaultBoardId = async (boards: BoardRepository): Promise<string> => {
  const [existing] = await boards.list();

  if (existing) {
    return existing.id;
  }

  const details = normalizeBoardDetails({ name: "Agent Team", rootPath: requiredEnv("PROJECT_ROOT") }, process.cwd());

  if (!details.ok) {
    throw new Error(details.reason);
  }

  const saved = await boards.save({ id: defaultBoardId, ...details.details });

  if (saved !== "applied") {
    throw new Error("The default board could not be saved");
  }

  return defaultBoardId;
};
