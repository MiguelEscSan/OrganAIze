import { join } from "node:path";
import type { PromptLibrary } from "@/ports/prompt-library";
import { createFilePromptLibrary } from "../prompts/file-prompt-library";

export const createRepositoryPromptLibrary = (): PromptLibrary => createFilePromptLibrary(join(process.cwd(), "prompts"));
