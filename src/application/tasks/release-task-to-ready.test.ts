import { describe, expect, it } from "vitest";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import { createScriptedLlmClient } from "@/adapters/in-memory/in-memory-llm-client";
import { buildTask } from "@/adapters/in-memory/task-fixtures";
import type { Request } from "@/domain/requests/request";
import { releaseTaskToReady } from "./release-task-to-ready";

const request: Request = { id: "request-1", boardId: "board-1", title: "Landing", description: "A landing page" };

const validPlan = {
  subtasks: [
    {
      title: "Add hero section",
      description: "Render the hero",
      acceptanceCriteria: ["Hero shows the headline"],
      files: ["src/app/page.tsx"],
      runsInParallel: false,
    },
  ],
};

describe("releaseTaskToReady", () => {
  it("moves the request to ready, claims it and splits it into subtasks", async () => {
    const deps = createInMemoryDependencies({
      requests: [request],
      tasks: [buildTask({ id: "task-1", requestId: "request-1", status: "definition" })],
    });
    const release = releaseTaskToReady({ ...deps, llm: createScriptedLlmClient({ ok: true, json: validPlan }) });

    const outcome = await release({ kind: "ReleaseTaskToReady", taskId: "task-1" });

    expect(outcome.ok).toBe(true);
    const tasks = await deps.tasks.list();
    expect(tasks.find((task) => task.id === "task-1")?.status).toBe("in_progress");
    expect(tasks.filter((task) => task.parentTaskId === "task-1").map((task) => task.title)).toEqual([
      "Add hero section",
    ]);
  });

  it("leaves the request in ready when another request is already in progress", async () => {
    const deps = createInMemoryDependencies({
      requests: [request],
      tasks: [
        buildTask({ id: "task-1", requestId: "request-1", status: "definition" }),
        buildTask({ id: "task-0", requestId: "request-0", status: "in_progress" }),
      ],
    });
    const release = releaseTaskToReady({ ...deps, llm: createScriptedLlmClient({ ok: true, json: validPlan }) });

    const outcome = await release({ kind: "ReleaseTaskToReady", taskId: "task-1" });

    expect(outcome.ok).toBe(true);
    const tasks = await deps.tasks.list();
    expect(tasks.find((task) => task.id === "task-1")?.status).toBe("ready");
    expect(tasks.filter((task) => task.parentTaskId === "task-1")).toEqual([]);
  });

  it("refuses to release a task that is not in definition", async () => {
    const deps = createInMemoryDependencies({
      requests: [request],
      tasks: [buildTask({ id: "task-1", requestId: "request-1", status: "qa" })],
    });
    const release = releaseTaskToReady({ ...deps, llm: createScriptedLlmClient({ ok: true, json: validPlan }) });

    const outcome = await release({ kind: "ReleaseTaskToReady", taskId: "task-1" });

    expect(outcome.ok).toBe(false);
    expect((await deps.tasks.list())[0].status).toBe("qa");
  });
});
