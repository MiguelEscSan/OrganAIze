import { describe, expect, it } from "vitest";
import { shownAttemptLimit } from "./failure-kind";
import { maxAttemptsPerTask, maxMechanicalAttemptsPerTask } from "./task-status";

describe("shownAttemptLimit", () => {
  it("shows the normal limit while the attempts fit in it", () => {
    expect(shownAttemptLimit(0)).toBe(maxAttemptsPerTask);
    expect(shownAttemptLimit(maxAttemptsPerTask)).toBe(maxAttemptsPerTask);
  });

  it("shows the extended limit once the attempts go past the normal one", () => {
    expect(shownAttemptLimit(maxAttemptsPerTask + 1)).toBe(maxMechanicalAttemptsPerTask);
    expect(shownAttemptLimit(maxMechanicalAttemptsPerTask)).toBe(maxMechanicalAttemptsPerTask);
  });
});
