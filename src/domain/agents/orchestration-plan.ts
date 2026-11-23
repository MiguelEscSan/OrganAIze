import { z } from "zod";
import { isInsideRoot } from "../boards/project-path";

const nonBlankText = z.string().trim().min(1);

const subtaskPlanSchema = z.object({
  title: nonBlankText,
  description: nonBlankText,
  acceptanceCriteria: z.array(nonBlankText).min(1),
  files: z.array(nonBlankText.refine(isInsideRoot, "Subtask files must stay inside the project root")).min(1),
  runsInParallel: z.boolean(),
});

const orchestrationPlanSchema = z
  .object({ subtasks: z.array(subtaskPlanSchema).min(1) })
  .superRefine((plan, context) => {
    plan.subtasks.forEach((subtask, index) => {
      const sharesFile = plan.subtasks.some(
        (other, otherIndex) =>
          otherIndex !== index && other.files.some((file) => subtask.files.includes(file)),
      );

      if (subtask.runsInParallel && sharesFile) {
        context.addIssue({
          code: "custom",
          path: ["subtasks", index, "runsInParallel"],
          message: "A parallel subtask cannot share a file with another subtask",
        });
      }
    });
  });

export type SubtaskPlan = z.infer<typeof subtaskPlanSchema>;
export type OrchestrationPlan = z.infer<typeof orchestrationPlanSchema>;

export type PlanOutcome = { ok: true; plan: OrchestrationPlan } | { ok: false; reason: string };

export const parseOrchestrationPlan = (raw: unknown): PlanOutcome => {
  const parsed = orchestrationPlanSchema.safeParse(raw);

  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message ?? "Plan is not valid" };
  }

  return { ok: true, plan: parsed.data };
};
