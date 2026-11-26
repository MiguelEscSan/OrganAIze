import { describe, expect, it } from "vitest";
import { parseOrchestrationPlan } from "./orchestration-plan";

const subtask = (overrides: Record<string, unknown> = {}) => ({
  title: "Add board column",
  description: "Render the QA column",
  acceptanceCriteria: ["QA column is visible"],
  files: ["src/presentation/board.tsx"],
  runsInParallel: false,
  ...overrides,
});

describe("parseOrchestrationPlan", () => {
  it("accepts sequential subtasks that share a file", () => {
    const outcome = parseOrchestrationPlan({
      subtasks: [subtask(), subtask({ title: "Style column", files: ["src/presentation/board.tsx"] })],
    });

    expect(outcome.ok).toBe(true);
  });

  it("accepts parallel subtasks whose files do not overlap", () => {
    const outcome = parseOrchestrationPlan({
      subtasks: [
        subtask({ runsInParallel: true, files: ["src/presentation/board.tsx"] }),
        subtask({ title: "Add settings field", runsInParallel: true, files: ["src/app/settings/page.tsx"] }),
      ],
    });

    expect(outcome.ok).toBe(true);
  });

  it("accepts a parallel subtask that shares a file, because the merge step reconciles it", () => {
    const outcome = parseOrchestrationPlan({
      subtasks: [
        subtask({ runsInParallel: true, files: ["src/presentation/board.tsx"] }),
        subtask({ title: "Style column", runsInParallel: true, files: ["src/presentation/board.tsx"] }),
      ],
    });

    expect(outcome.ok).toBe(true);
  });

  it("rejects a plan without subtasks", () => {
    expect(parseOrchestrationPlan({ subtasks: [] }).ok).toBe(false);
  });

  it("rejects a subtask without acceptance criteria", () => {
    expect(parseOrchestrationPlan({ subtasks: [subtask({ acceptanceCriteria: [] })] }).ok).toBe(false);
  });

  it("rejects output that is not a plan at all", () => {
    expect(parseOrchestrationPlan("not json").ok).toBe(false);
  });
  it("rejects a subtask file that leaves the project root", () => {
    const outcome = parseOrchestrationPlan({
      subtasks: [subtask({ files: ["../agent-team/src/app/page.tsx"] })],
    });

    expect(outcome.ok).toBe(false);
  });

  it("rejects a plan whose app entry is not at the project root", () => {
    const outcome = parseOrchestrationPlan({
      subtasks: [subtask({ files: ["src/App.tsx"] })],
    });

    expect(outcome).toEqual({
      ok: false,
      reason: "The app entry must be App.tsx at the project root, not src/App.tsx",
    });
  });

  it("accepts the app entry at the project root", () => {
    const outcome = parseOrchestrationPlan({
      subtasks: [subtask({ files: ["App.tsx", "src/weatherApi.ts"] })],
    });

    expect(outcome.ok).toBe(true);
  });

  it("rejects an App.tsx nested in any folder", () => {
    const outcome = parseOrchestrationPlan({
      subtasks: [subtask({ files: ["src/components/App.tsx"] })],
    });

    expect(outcome.ok).toBe(false);
  });
});
