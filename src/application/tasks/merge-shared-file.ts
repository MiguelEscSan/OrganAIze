import { z } from "zod";
import type { LlmClient } from "@/ports/llm-client";
import { fail, succeed, type Outcome } from "../shared/outcome";

export type SharedFileMerge = {
  path: string;
  base: string | null;
  current: string;
  proposed: string;
};

const mergeReplySchema = z.object({ content: z.string().min(1) });

const describeBase = (base: string | null): string => (base === null ? "(new file)" : base);

const mergePrompt = (merge: SharedFileMerge): string =>
  [
    `Merge two independent edits to the file ${merge.path}.`,
    "Base: the content the editors started from.",
    `### Base\n${describeBase(merge.base)}`,
    `### Current file on disk, edited by another subtask\n${merge.current}`,
    `### Proposed file from this subtask\n${merge.proposed}`,
    'Reply with JSON only, in the form {"content": "the full merged file content"}.',
    "Keep every change from both edits. If the edits cannot both hold, keep the proposed file's change and say nothing else.",
  ].join("\n\n");

export const mergeSharedFile = async (llm: LlmClient, merge: SharedFileMerge): Promise<Outcome<string>> => {
  const reply = await llm.generateJson(mergePrompt(merge));

  if (!reply.ok) {
    return fail(reply.reason);
  }

  const parsed = mergeReplySchema.safeParse(reply.json);

  return parsed.success ? succeed(parsed.data.content) : fail("The merge reply does not match the expected format");
};
