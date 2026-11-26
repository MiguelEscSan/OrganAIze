import { describe, expect, it } from "vitest";
import { buildTask } from "@/adapters/in-memory/task-fixtures";
import type { Task } from "./task";
import { rejectRequest } from "./reject-request";

const requestWithTwoSubtasks = (overrides: Partial<Task> = {}): Task[] => [
  buildTask({ id: "request", status: "qa" }),
  buildTask({ id: "header", parentTaskId: "request", status: "awaiting_release", files: ["src/header.tsx"], ...overrides }),
  buildTask({ id: "footer", parentTaskId: "request", status: "awaiting_release", files: ["src/footer.tsx"] }),
];

const maxAttempts = 3;

describe("rejectRequest", () => {
  it("returns only the subtask that declares the failing file", () => {
    const result = rejectRequest(
      requestWithTwoSubtasks(),
      "request",
      [{ criterion: "Menu is visible", file: "src/header.tsx", message: "The menu is hidden" }],
      maxAttempts,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      const find = (id: string) => result.tasks.find((task) => task.id === id);
      expect(find("request")?.status).toBe("in_progress");
      expect(find("header")).toEqual(
        expect.objectContaining({
          status: "in_progress",
          attempts: 1,
          lastFeedback: "1. Menu is visible (src/header.tsx): The menu is hidden",
        }),
      );
      expect(find("footer")).toEqual(expect.objectContaining({ status: "awaiting_release", attempts: 0 }));
      expect(result.events.map((event) => [event.taskId, event.from, event.to])).toEqual([
        ["request", "qa", "in_progress"],
        ["header", "awaiting_release", "in_progress"],
      ]);
    }
  });

  it("returns every subtask for a failure without a file", () => {
    const result = rejectRequest(
      requestWithTwoSubtasks(),
      "request",
      [{ criterion: "Page loads", file: null, message: "Blank page" }],
      maxAttempts,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.tasks.filter((task) => task.status === "in_progress").map((task) => task.id)).toEqual([
        "request",
        "header",
        "footer",
      ]);
      expect(result.tasks.find((task) => task.id === "footer")?.lastFeedback).toBe("1. Page loads: Blank page");
    }
  });

  it("returns every subtask for a file that no subtask declares", () => {
    const result = rejectRequest(
      requestWithTwoSubtasks(),
      "request",
      [{ criterion: "Page loads", file: "src/unknown.tsx", message: "Broken" }],
      maxAttempts,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.tasks.filter((task) => task.parentTaskId === "request").every((task) => task.status === "in_progress")).toBe(
        true,
      );
    }
  });

  it("numbers the failures of a subtask in order", () => {
    const result = rejectRequest(
      requestWithTwoSubtasks(),
      "request",
      [
        { criterion: "Menu is visible", file: "src/header.tsx", message: "Hidden" },
        { criterion: "Page loads", file: null, message: "Blank" },
        { criterion: "Footer shows year", file: "src/footer.tsx", message: "Missing" },
      ],
      maxAttempts,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.tasks.find((task) => task.id === "header")?.lastFeedback).toBe(
        "1. Menu is visible (src/header.tsx): Hidden\n2. Page loads: Blank",
      );
      expect(result.tasks.find((task) => task.id === "footer")?.lastFeedback).toBe(
        "1. Page loads: Blank\n2. Footer shows year (src/footer.tsx): Missing",
      );
    }
  });

  it("sends a subtask to review when it reaches the attempt limit", () => {
    const result = rejectRequest(
      requestWithTwoSubtasks({ attempts: 2 }),
      "request",
      [{ criterion: "Menu is visible", file: "src/header.tsx", message: "Hidden" }],
      maxAttempts,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.tasks.find((task) => task.id === "header")).toEqual(
        expect.objectContaining({ status: "review", attempts: 3, reviewReason: "attempts" }),
      );
      expect(result.events.find((event) => event.taskId === "header")?.to).toBe("review");
    }
  });

  it("refuses an empty list of failures", () => {
    expect(rejectRequest(requestWithTwoSubtasks(), "request", [], maxAttempts).ok).toBe(false);
  });

  it("refuses a request that is not in qa", () => {
    const tasks = requestWithTwoSubtasks().map((task) => (task.id === "request" ? { ...task, status: "in_progress" as const } : task));

    const result = rejectRequest(tasks, "request", [{ criterion: "c", file: null, message: "m" }], maxAttempts);

    expect(result.ok).toBe(false);
  });

  it("refuses an unknown request", () => {
    expect(rejectRequest([], "missing", [{ criterion: "c", file: null, message: "m" }], maxAttempts).ok).toBe(false);
  });
});
