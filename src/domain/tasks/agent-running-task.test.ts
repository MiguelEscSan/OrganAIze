import { describe, expect, it } from "vitest";
import { agentRunningTask } from "./agent-running-task";
import type { Task } from "./task";

const createTask = (overrides: Partial<Task>): Task => ({
  id: "task-1",
  requestId: "request-1",
  title: "Task",
  description: "",
  acceptanceCriteria: [],
  files: [],
  status: "in_progress",
  assignedAgent: null,
  attempts: 0,
  lastFeedback: null,
  reviewReason: null,
  parentTaskId: null,
  liveStatus: "Working",
  ...overrides,
});

describe("agentRunningTask", () => {
  it("is nobody when the task has no live status", () => {
    expect(agentRunningTask(createTask({ liveStatus: null, assignedAgent: "develop" }))).toBeNull();
  });

  it("is develop for a subtask in progress assigned to develop", () => {
    expect(agentRunningTask(createTask({ assignedAgent: "develop", parentTaskId: "request-1" }))).toBe("develop");
  });

  it("is testing for a subtask in qa even though it stays assigned to develop", () => {
    expect(agentRunningTask(createTask({ status: "qa", assignedAgent: "develop", parentTaskId: "request-1" }))).toBe(
      "testing",
    );
  });

  it("is testing for a whole request in qa", () => {
    expect(agentRunningTask(createTask({ status: "qa" }))).toBe("testing");
  });

  it("is the orchestrator for a request in progress without an agent", () => {
    expect(agentRunningTask(createTask({ status: "in_progress", assignedAgent: null }))).toBe("orchestrator");
  });

  it("is nobody for a subtask in progress without an agent", () => {
    expect(agentRunningTask(createTask({ assignedAgent: null, parentTaskId: "request-1" }))).toBeNull();
  });

  it("is nobody for statuses where no agent runs", () => {
    expect(agentRunningTask(createTask({ status: "deploy", assignedAgent: "develop" }))).toBeNull();
  });
});
