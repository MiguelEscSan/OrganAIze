import { z } from "zod";
import type { LlmClient } from "@/ports/llm-client";
import type { PromptLibrary } from "@/ports/prompt-library";
import type { PromptDependencies } from "../shared/dependencies";
import { fail, succeed, type Outcome } from "../shared/outcome";

export type SharedFileMerge = {
  path: string;
  base: string | null;
  current: string;
  proposed: string;
};

const mergeReplySchema = z.object({ content: z.string().min(1) });

const describeBase = (base: string | null): string => (base === null ? "(new file)" : base);

const mergePrompt = (prompts: PromptLibrary, merge: SharedFileMerge): string =>
  prompts.render("merge", {
    path: merge.path,
    base: describeBase(merge.base),
    current: merge.current,
    proposed: merge.proposed,
  });

export type MergeDependencies = PromptDependencies & { llm: LlmClient };

export const mergeSharedFile = async (deps: MergeDependencies, merge: SharedFileMerge): Promise<Outcome<string>> => {
  const reply = await deps.llm.generateJson(mergePrompt(deps.prompts, merge));

  if (!reply.ok) {
    return fail(reply.reason);
  }

  const parsed = mergeReplySchema.safeParse(reply.json);

  return parsed.success ? succeed(parsed.data.content) : fail("The merge reply does not match the expected format");
};
