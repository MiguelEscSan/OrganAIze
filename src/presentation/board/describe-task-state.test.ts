import { describe, expect, it } from "vitest";
import { describeTaskState } from "./describe-task-state";

describe("describeTaskState", () => {
  it("says the whole request is being tested when a request is in QA", () => {
    expect(describeTaskState("qa", "request")).toBe("Testing the whole request");
  });

  it("says an audited subtask waits for the others", () => {
    expect(describeTaskState("awaiting_release", "subtask")).toBe("Audited, waiting for the other subtasks");
  });

  it("says nothing for a subtask in QA", () => {
    expect(describeTaskState("qa", "subtask")).toBeNull();
  });

  it("says nothing for other columns", () => {
    expect(describeTaskState("in_progress", "request")).toBeNull();
    expect(describeTaskState("deploy", "subtask")).toBeNull();
  });
});
