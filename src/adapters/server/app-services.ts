import { join } from "node:path";
import type { Mediator } from "@/application/cqrs/mediator";
import { createMediator } from "@/application/register-handlers";
import type { BoardRepository } from "@/ports/board-repository";
import type { LlmClient } from "@/ports/llm-client";
import { createFflateArchiveWriter } from "../archive/fflate-archive-writer";
import { createLlmClientFromEnv } from "../config/llm-client-from-env";
import { createFilePromptLibrary } from "../prompts/file-prompt-library";
import { createUndiciOllamaFetch } from "../ollama/ollama-fetch";
import type { OllamaFetch } from "../ollama/ollama-llm-client";
import { createDrizzleBoardRepository } from "../drizzle/drizzle-board-repository";
import { createDrizzleDependencies } from "../drizzle/create-drizzle-dependencies";
import { createDatabase } from "../drizzle/client";
import { createDiskWorkspaceWriter } from "../workspace/disk-workspace-writer";
import { createDiskProjectFiles } from "../workspace/disk-project-files";
import { createSupabaseObjectStoreFromEnv } from "../supabase/create-supabase-workspace";
import { createSupabaseProjectFiles } from "../supabase/supabase-project-files";
import { createSupabaseWorkspaceWriter } from "../supabase/supabase-workspace-writer";
import { lazily, routedProjectFiles, routedWorkspaceFor } from "./routed-workspace";
import { browserCheckEnabled } from "./browser-check-enabled";
import { createPlaywrightInterfaceProbe } from "../playwright/playwright-interface-probe";
import { createMaterializingInterfaceProbe } from "../playwright/materializing-interface-probe";
import { createTypeScriptProjectTypeChecker } from "../typescript/typescript-project-type-checker";

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

const fetcherForProvider = (provider: string | undefined): OllamaFetch =>
  provider?.trim() === "ollama"
    ? createUndiciOllamaFetch()
    : (url, init) => fetch(url, init);

const llmFromEnvironment =(): LlmClient => {
  const outcome = createLlmClientFromEnv(process.env, fetcherForProvider(process.env.LLM_PROVIDER));

  return outcome.ok ? outcome.llm : unavailableLlm(outcome.reason);
};

const buildServices = (): AppServices => {
  const db = createDatabase(requiredEnv("DATABASE_URL"));
  const objectStore = lazily(createSupabaseObjectStoreFromEnv);
  const projectFiles = routedProjectFiles(createDiskProjectFiles(), {
    list: (location) => createSupabaseProjectFiles(objectStore()).list(location),
  });

  return {
    mediator: createMediator({
      ...createDrizzleDependencies(db),
      llm: llmFromEnvironment(),
      prompts: createFilePromptLibrary(join(process.cwd(), "prompts")),
      boards: createDrizzleBoardRepository(db),
      appRoot: process.cwd(),
      workspaceFor: routedWorkspaceFor(createDiskWorkspaceWriter, (location) =>
        createSupabaseWorkspaceWriter(objectStore(), location),
      ),
      interfaceProbe: createMaterializingInterfaceProbe(createPlaywrightInterfaceProbe(), projectFiles),
      browserCheckEnabled,
      projectFiles,
      typeChecker: createTypeScriptProjectTypeChecker(),
      archiveWriter: createFflateArchiveWriter(),
    }),
    boards: createDrizzleBoardRepository(db),
  };
};

export const getAppServices = (): AppServices => {
  globalWithServices.agentTeamServices ??= buildServices();

  return globalWithServices.agentTeamServices;
};

export const resolveDefaultBoardId = async (boards: BoardRepository): Promise<string | null> => {
  const [existing] = await boards.list();

  return existing?.id ?? null;
};
