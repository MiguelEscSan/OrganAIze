export const agentNames = ["orchestrator", "develop", "testing"] as const;

export type AgentName = (typeof agentNames)[number];
