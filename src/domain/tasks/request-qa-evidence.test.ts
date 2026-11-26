import { describe, expect, it } from "vitest";
import { browserCheckDisabledEvidence, reviewedAppEvidence } from "./request-qa-evidence";

const reviewed = (overrides: Partial<Parameters<typeof reviewedAppEvidence>[0]> = {}) =>
  reviewedAppEvidence({ pageText: "Weather Forecast", consoleErrorCount: 0, subtaskCount: 3, criteriaCount: 9, ...overrides });

describe("request QA evidence", () => {
  it("says the running app was not reviewed when the browser check is disabled", () => {
    expect(browserCheckDisabledEvidence).toBe("The browser check is disabled, so the running app was not reviewed.");
  });

  it("states what was reviewed with the counts and a short excerpt", () => {
    expect(reviewed()).toBe(
      'Reviewed the running app: 16 characters of visible text, 0 console errors, 3 subtasks with 9 acceptance criteria. Visible text starts: "Weather Forecast"',
    );
  });

  it("reports the console error count", () => {
    expect(reviewed({ consoleErrorCount: 2 })).toContain("2 console errors");
  });

  it("collapses whitespace in the excerpt", () => {
    expect(reviewed({ pageText: "Weather\n\n  Forecast\t22°C" })).toContain('Visible text starts: "Weather Forecast 22°C"');
  });

  it("cuts the excerpt to 200 characters and counts the whole page", () => {
    const evidence = reviewed({ pageText: "x".repeat(1000) });

    expect(evidence).toContain("1000 characters of visible text");
    expect(evidence).toContain(`"${"x".repeat(200)}"`);
    expect(evidence).not.toContain("x".repeat(201));
  });
});
