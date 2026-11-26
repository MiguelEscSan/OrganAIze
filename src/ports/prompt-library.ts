export type PromptName = "orchestrator" | "develop" | "merge" | "testing-subtask" | "testing-request";

export type PromptVariables = Readonly<Record<string, string | undefined>>;

export type PromptLibrary = {
  render(name: PromptName, variables: PromptVariables): string;
};
