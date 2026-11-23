import type { AgentName } from "../agents/agent-name";
import type { TaskStatus } from "./task-status";

export type Task = {
  id: string;
  requestId: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignedAgent: AgentName | null;
  attempts: number;
  lastFeedback: string | null;
};
