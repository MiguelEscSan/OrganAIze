import { describe, expect, it } from "vitest";
import { buildTask } from "@/adapters/in-memory/task-fixtures";
import { qaFullReason } from "./qa-capacity";

describe("qaFullReason", () => {
  it("reports QA as full when tasks in qa reach the limit", () => {
    const tasks = [buildTask({ id: "a", status: "qa" }), buildTask({ id: "b", status: "qa" })];

    expect(qaFullReason(tasks, 2)).toBeDefined();
  });

  it("does not count tasks awaiting release", () => {
    const tasks = [
      buildTask({ id: "a", status: "qa" }),
      buildTask({ id: "b", status: "awaiting_release" }),
      buildTask({ id: "c", status: "awaiting_release" }),
    ];

    expect(qaFullReason(tasks, 2)).toBeUndefined();
  });
});
