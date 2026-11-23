import type { Task } from "../tasks/task";
import type { AgentActivity } from "./develop-activity";

export const testingActivity = (tasks: readonly Task[]): AgentActivity => {
  const reviewing = tasks.find((task) => task.status === "qa");

  return reviewing
    ? { state: "working", message: `Reviewing "${reviewing.title}"` }
    : { state: "idle", message: "No subtask is waiting for Testing" };
};
