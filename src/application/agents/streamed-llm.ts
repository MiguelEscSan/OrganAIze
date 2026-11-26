import type { LlmClient, LlmProgressListener } from "@/ports/llm-client";

export type ProgressReport = (detail: string) => Promise<void>;

const charactersPerReport = 500;

const reportCharacters = (report: ProgressReport): LlmProgressListener => {
  let lastReportedStep = 0;

  return async ({ characters }) => {
    const step = Math.floor(characters / charactersPerReport);

    if (step === lastReportedStep) {
      return;
    }

    lastReportedStep = step;
    await report(`${characters.toLocaleString("en-US")} characters`);
  };
};

export const streamedLlm = (llm: LlmClient, report: ProgressReport): LlmClient => ({
  contextWindowTokens: llm.contextWindowTokens,
  generateJson: (prompt) => llm.generateJson(prompt, reportCharacters(report)),
});
