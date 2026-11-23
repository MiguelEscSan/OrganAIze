import { z } from "zod";

const developFileSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
});

const developOutputSchema = z.object({
  files: z.array(developFileSchema).min(1),
});

export type DevelopFile = z.infer<typeof developFileSchema>;
export type DevelopOutput = z.infer<typeof developOutputSchema>;

export type DevelopOutcome = { ok: true; output: DevelopOutput } | { ok: false; reason: string };

export const parseDevelopOutput = (raw: unknown): DevelopOutcome => {
  const parsed = developOutputSchema.safeParse(raw);

  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message ?? "Develop output is not valid" };
  }

  return { ok: true, output: parsed.data };
};
