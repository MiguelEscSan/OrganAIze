import type { AgentName } from "../agents/agent-name";
import type { Task } from "./task";

export const agentRunningTask = (task: Task): AgentName | null => {
  if (!task.liveStatus) {
    return null;
  }

  if (task.status === "qa") {
    return "testing";
  }

  if (task.status !== "in_progress") {
    return null;
  }

  if (task.assignedAgent !== null) {
    return task.assignedAgent;
  }

  return task.parentTaskId === null ? "orchestrator" : null;
};
