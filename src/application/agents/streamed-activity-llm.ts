import type { AgentActivityRecord } from "@/domain/agents/agent-activity";
import type { AgentActivityRepository } from "@/ports/agent-activity-repository";
import type { LlmClient, LlmProgressListener } from "@/ports/llm-client";

const charactersPerRecord = 500;

const reportCharacters = (activity: AgentActivityRepository, working: AgentActivityRecord): LlmProgressListener => {
  let lastRecordedStep = 0;

  return async ({ characters }) => {
    const step = Math.floor(characters / charactersPerRecord);

    if (step === lastRecordedStep) {
      return;
    }

    lastRecordedStep = step;
    await activity.record({
      ...working,
      message: `${working.message} · ${characters.toLocaleString("en-US")} characters`,
    });
  };
};

export const streamedActivityLlm = (
  llm: LlmClient,
  activity: AgentActivityRepository,
  working: AgentActivityRecord,
): LlmClient => ({
  generateJson: (prompt) => llm.generateJson(prompt, reportCharacters(activity, working)),
});
