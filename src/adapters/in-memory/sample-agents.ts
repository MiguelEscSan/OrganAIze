import type { AgentName } from "@/domain/agents/agent-name";

export type AgentProfile = {
  name: AgentName;
  displayName: string;
  role: string;
  responsibility: string;
};

export const sampleAgents: readonly AgentProfile[] = [
  {
    name: "orchestrator",
    displayName: "Orchestrator",
    role: "Plans the work",
    responsibility: "Splits each request into subtasks and writes their acceptance criteria.",
  },
  {
    name: "develop",
    displayName: "Develop",
    role: "Writes the code",
    responsibility: "Implements one subtask at a time, inside its declared scope.",
  },
  {
    name: "testing",
    displayName: "Testing",
    role: "Judges the result",
    responsibility: "Checks the work against the acceptance criteria and returns numbered failures.",
  },
];
