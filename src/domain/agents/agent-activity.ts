import type { AgentName } from "./agent-name";

export const agentStates = ["idle", "working", "reviewing"] as const;

export type AgentState = (typeof agentStates)[number];

export type AgentActivityRecord = {
  agent: AgentName;
  state: AgentState;
  message: string;
};
