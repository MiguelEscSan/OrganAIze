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

const isNestedAppEntry = (path: string): boolean => /[\\/]App\.tsx$/.test(path);

const orchestrationPlanSchema = z.object({ subtasks: z.array(subtaskPlanSchema).min(1) }).superRefine((plan, context) => {
  const nested = plan.subtasks.flatMap((subtask) => subtask.files).find(isNestedAppEntry);

  if (nested) {
    context.addIssue({
      code: "custom",
      message: `The app entry must be App.tsx at the project root, not ${nested}`,
    });
  }
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
