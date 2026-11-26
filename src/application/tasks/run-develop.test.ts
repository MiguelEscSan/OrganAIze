import { describe, expect, it } from "vitest";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import { createScriptedLlmClient } from "@/adapters/in-memory/in-memory-llm-client";
import { buildTask } from "@/adapters/in-memory/task-fixtures";
import { createInMemoryWorkspaceWriter } from "@/adapters/in-memory/in-memory-workspace-writer";
import { createInMemoryBoardRepository } from "@/adapters/in-memory/in-memory-board-repository";
import { createInMemoryProjectFiles } from "@/adapters/in-memory/in-memory-project-files";
import { developSeed, inMemoryDevelopDependencies } from "@/adapters/in-memory/in-memory-workspace-dependencies";
import type { Task } from "@/domain/tasks/task";
import type { LlmClient } from "@/ports/llm-client";
import { runDevelop } from "./run-develop";

const subtask = (overrides: Partial<Task> = {}): Task =>
  buildTask({
    id: "subtask-1",
    requestId: "request-1",
    parentTaskId: "parent-1",
    status: "in_progress",
    assignedAgent: "develop",
    files: ["src/app/page.tsx"],
    acceptanceCriteria: ["Hero shows the headline"],
    ...overrides,
  });

const validOutput = { files: [{ path: "src/app/page.tsx", content: "export default 'new';" }] };

const setup = (task: Task, llm: Parameters<typeof createScriptedLlmClient>[0]) => {
  const deps = createInMemoryDependencies({ ...developSeed, tasks: [task] });
  const workspace = createInMemoryWorkspaceWriter({ "src/app/page.tsx": "export default 'old';" });
  const run = runDevelop({ ...deps, ...inMemoryDevelopDependencies(workspace), llm: createScriptedLlmClient(llm) });

  return { deps, workspace, run };
};

const taskById = async (deps: ReturnType<typeof createInMemoryDependencies>, taskId: string) =>
  (await deps.tasks.list()).find((task) => task.id === taskId);

describe("runDevelop", () => {
  it("writes the files and moves the subtask to qa when the output is in scope", async () => {
    const { deps, workspace, run } = setup(subtask(), { ok: true, json: validOutput });

    const outcome = await run({ kind: "RunDevelop", taskId: "subtask-1" });

    expect(outcome.ok).toBe(true);
    expect(workspace.files()["src/app/page.tsx"]).toBe("export default 'new';");
    expect((await taskById(deps, "subtask-1"))?.status).toBe("qa");
  });

  it("refuses output that writes outside the file scope and writes nothing", async () => {
    const output = {
      files: [
        { path: "src/app/page.tsx", content: "changed" },
        { path: "package.json", content: "{}" },
      ],
    };
    const { deps, workspace, run } = setup(subtask(), { ok: true, json: output });

    const outcome = await run({ kind: "RunDevelop", taskId: "subtask-1" });

    expect(outcome.ok).toBe(false);
    expect(workspace.files()).toEqual({ "src/app/page.tsx": "export default 'old';" });
    const task = await taskById(deps, "subtask-1");
    expect([task?.status, task?.attempts]).toEqual(["in_progress", 1]);
    expect(task?.lastFeedback).toBe("Develop wrote outside its file scope: package.json. Allowed files: src/app/page.tsx.");
  });

  it("counts invalid output as a failed attempt and keeps the subtask in progress", async () => {
    const { deps, workspace, run } = setup(subtask(), { ok: true, json: { files: [] } });

    const outcome = await run({ kind: "RunDevelop", taskId: "subtask-1" });

    expect(outcome.ok).toBe(false);
    expect(workspace.files()["src/app/page.tsx"]).toBe("export default 'old';");
    const task = await taskById(deps, "subtask-1");
    expect([task?.status, task?.attempts]).toEqual(["in_progress", 1]);
  });

  it("counts an LLM failure as a failed attempt with its reason", async () => {
    const { deps, run } = setup(subtask(), { ok: false, reason: "Gemini is unavailable" });

    const outcome = await run({ kind: "RunDevelop", taskId: "subtask-1" });

    expect(outcome).toEqual({ ok: false, reason: "Gemini is unavailable" });
    const task = await taskById(deps, "subtask-1");
    expect([task?.status, task?.attempts, task?.lastFeedback]).toEqual([
      "in_progress",
      1,
      "Gemini is unavailable",
    ]);
  });

  it("shows the live status of the subtask while it is written and clears it afterwards", async () => {
    const deps = createInMemoryDependencies({ ...developSeed, tasks: [subtask()] });
    const workspace = createInMemoryWorkspaceWriter({ "src/app/page.tsx": "export default 'old';" });
    const seen: (string | null)[] = [];
    const llm: LlmClient = {
      generateJson: async (_prompt, onProgress) => {
        await onProgress?.({ characters: 600 });
        seen.push((await taskById(deps, "subtask-1"))?.liveStatus ?? null);
        return { ok: true, json: validOutput };
      },
    };
    const run = runDevelop({ ...deps, ...inMemoryDevelopDependencies(workspace), llm });

    await run({ kind: "RunDevelop", taskId: "subtask-1" });

    expect(seen).toEqual(["Writing · 600 characters"]);
    expect((await taskById(deps, "subtask-1"))?.liveStatus ?? null).toBeNull();
  });

  it("does not count a model that cannot be reached as a failed attempt", async () => {
    const { deps, run } = setup(subtask(), {
      ok: false,
      reason: "Ollama request failed: fetch failed",
      unavailable: true,
    });

    const outcome = await run({ kind: "RunDevelop", taskId: "subtask-1" });

    expect(outcome.ok).toBe(false);
    const task = await taskById(deps, "subtask-1");
    expect([task?.status, task?.attempts]).toEqual(["in_progress", 0]);
  });

  it("keeps the subtask in progress after its third mechanical failure", async () => {
    const { deps, run } = setup(subtask({ attempts: 2 }), { ok: true, json: { files: [] } });

    await run({ kind: "RunDevelop", taskId: "subtask-1" });

    const task = await taskById(deps, "subtask-1");
    expect([task?.status, task?.attempts, task?.reviewReason]).toEqual(["in_progress", 3, null]);
  });

  it("sends the subtask to review after its sixth mechanical failure", async () => {
    const { deps, run } = setup(subtask({ attempts: 5 }), { ok: true, json: { files: [] } });

    await run({ kind: "RunDevelop", taskId: "subtask-1" });

    const task = await taskById(deps, "subtask-1");
    expect([task?.status, task?.attempts, task?.reviewReason]).toEqual(["review", 6, "attempts"]);
  });

  describe("budgets", () => {
    const START = "2026-11-23T10:00:00.000Z";

    const runWithUsage = (usage: { minutesLater: number; totalTokens?: number }) => {
      const deps = createInMemoryDependencies({ ...developSeed, tasks: [subtask()] });
      const workspace = createInMemoryWorkspaceWriter({ "src/app/page.tsx": "export default 'old';" });
      const startedMs = Date.parse(START);
      let now = START;
      const llm = {
        generateJson: async () => {
          now = new Date(startedMs + usage.minutesLater * 60_000).toISOString();
          return { ok: true as const, json: validOutput, totalTokens: usage.totalTokens };
        },
      };
      const clock = { now: () => now };
      const run = runDevelop({ ...deps, ...inMemoryDevelopDependencies(workspace), clock, llm });

      return { deps, workspace, run };
    };

    it("stops the run when it takes longer than the time budget", async () => {
      const { deps, workspace, run } = runWithUsage({ minutesLater: 16, totalTokens: 100 });

      await run({ kind: "RunDevelop", taskId: "subtask-1" });

      const task = await taskById(deps, "subtask-1");
      expect([task?.status, task?.attempts, task?.reviewReason]).toEqual(["review", 0, "budget"]);
      expect(task?.lastFeedback).toBe("Stopped after 16 min, over the 15 min budget");
      expect(workspace.files()["src/app/page.tsx"]).toBe("export default 'old';");
    });

    it("stops the run when it uses more tokens than the token budget", async () => {
      const { deps, workspace, run } = runWithUsage({ minutesLater: 1, totalTokens: 50_001 });

      await run({ kind: "RunDevelop", taskId: "subtask-1" });

      const task = await taskById(deps, "subtask-1");
      expect([task?.status, task?.attempts, task?.reviewReason]).toEqual(["review", 0, "budget"]);
      expect(task?.lastFeedback).toBe("Stopped after 50001 tokens, over the 50000 token budget");
      expect(workspace.files()["src/app/page.tsx"]).toBe("export default 'old';");
    });

    it("lets the run finish when it stays within both budgets", async () => {
      const { deps, run } = runWithUsage({ minutesLater: 14, totalTokens: 50_000 });

      const outcome = await run({ kind: "RunDevelop", taskId: "subtask-1" });

      expect(outcome.ok).toBe(true);
      expect((await taskById(deps, "subtask-1"))?.status).toBe("qa");
    });
  });

  it("writes nothing and keeps the attempt count when QA is already full", async () => {
    const qaTasks = [
      buildTask({ id: "qa-1", requestId: "request-1", parentTaskId: "parent-1", status: "qa" }),
      buildTask({ id: "qa-2", requestId: "request-1", parentTaskId: "parent-1", status: "qa" }),
    ];
    const deps = createInMemoryDependencies({ ...developSeed, tasks: [subtask(), ...qaTasks] });
    const workspace = createInMemoryWorkspaceWriter({ "src/app/page.tsx": "export default 'old';" });
    const run = runDevelop({
      ...deps,
      ...inMemoryDevelopDependencies(workspace),
      llm: createScriptedLlmClient({ ok: true, json: validOutput }),
    });

    const outcome = await run({ kind: "RunDevelop", taskId: "subtask-1" });

    expect(outcome.ok).toBe(false);
    expect(workspace.files()).toEqual({ "src/app/page.tsx": "export default 'old';" });
    const task = await taskById(deps, "subtask-1");
    expect([task?.status, task?.attempts]).toEqual(["in_progress", 0]);
  });

  it("writes into the root path of the board that owns the subtask's request", async () => {
    const roots: string[] = [];
    const deps = createInMemoryDependencies({
      requests: [{ id: "request-1", boardId: "board-a", title: "Landing", description: "" }],
      tasks: [subtask()],
    });
    const workspace = createInMemoryWorkspaceWriter({ "src/app/page.tsx": "export default 'old';" });
    const run = runDevelop({
      ...deps,
      projectFiles: createInMemoryProjectFiles(workspace),
      boards: createInMemoryBoardRepository([
        { id: "board-a", name: "A", rootPath: "C:/projects/a" },
        { id: "board-b", name: "B", rootPath: "C:/projects/b" },
      ]),
      workspaceFor: (rootPath) => {
        roots.push(rootPath);
        return workspace;
      },
      llm: createScriptedLlmClient({ ok: true, json: validOutput }),
    });

    await run({ kind: "RunDevelop", taskId: "subtask-1" });

    expect(roots).toEqual(["C:/projects/a"]);
    expect(workspace.files()["src/app/page.tsx"]).toBe("export default 'new';");
  });

  it("refuses to run a subtask that is not in progress", async () => {
    const { run } = setup(subtask({ status: "ready" }), { ok: true, json: validOutput });

    const outcome = await run({ kind: "RunDevelop", taskId: "subtask-1" });

    expect(outcome.ok).toBe(false);
  });
});

describe("runDevelop prompt", () => {
  it("does not steer the developer toward App.tsx beyond the files of its subtask", async () => {
    const prompts: string[] = [];
    const llm = {
      generateJson: async (prompt: string) => {
        prompts.push(prompt);
        return { ok: true as const, json: validOutput };
      },
    };
    const deps = createInMemoryDependencies({ ...developSeed, tasks: [subtask()] });
    const workspace = createInMemoryWorkspaceWriter({});
    const runWith = runDevelop({ ...deps, ...inMemoryDevelopDependencies(workspace), llm });

    await runWith({ kind: "RunDevelop", taskId: "subtask-1" });

    expect(prompts[0]).not.toContain("App.tsx");
  });

  it("includes the feedback from the last review so the developer can fix it", async () => {
    const prompts: string[] = [];
    const llm = {
      generateJson: async (prompt: string) => {
        prompts.push(prompt);
        return { ok: true as const, json: validOutput };
      },
    };
    const feedback = "1. src/app/card.tsx:2: Headline missing";
    const deps = createInMemoryDependencies({ ...developSeed, tasks: [subtask({ lastFeedback: feedback })] });
    const workspace = createInMemoryWorkspaceWriter({});
    const runWith = runDevelop({ ...deps, ...inMemoryDevelopDependencies(workspace), llm });

    await runWith({ kind: "RunDevelop", taskId: "subtask-1" });

    expect(prompts[0]).toContain(feedback);
  });

  describe("history of failures", () => {
    const historyHeading = "Previous failures of this subtask";

    const promptAfter = async (failures: { from: "qa" | "in_progress"; reason: string }[]): Promise<string> => {
      const prompts: string[] = [];
      const llm = {
        generateJson: async (prompt: string) => {
          prompts.push(prompt);
          return { ok: true as const, json: validOutput };
        },
      };
      const deps = createInMemoryDependencies({ ...developSeed, tasks: [subtask({ attempts: failures.length })] });
      await deps.events.append({
        taskId: "subtask-1",
        from: "in_progress",
        to: "in_progress",
        actor: "system",
        reason: "Created from parent-1 by the orchestrator",
      });
      for (const failure of failures) {
        await deps.events.append({ taskId: "subtask-1", from: failure.from, to: "in_progress", actor: "system", reason: failure.reason });
      }
      const workspace = createInMemoryWorkspaceWriter({});
      const runWith = runDevelop({ ...deps, ...inMemoryDevelopDependencies(workspace), llm });

      await runWith({ kind: "RunDevelop", taskId: "subtask-1" });

      return prompts[0];
    };

    it("lists every previous failure in order, numbered by attempt", async () => {
      const prompt = await promptAfter([
        { from: "in_progress", reason: "Develop output is not valid JSON" },
        { from: "qa", reason: "1. src/app/page.tsx:2: Syntax error" },
      ]);

      expect(prompt).toContain(historyHeading);
      expect(prompt.indexOf("Attempt 1: Develop output is not valid JSON")).toBeGreaterThan(-1);
      expect(prompt.indexOf("Attempt 2: 1. src/app/page.tsx:2: Syntax error")).toBeGreaterThan(
        prompt.indexOf("Attempt 1: Develop output is not valid JSON"),
      );
    });

    it("shows no history for a subtask that never failed", async () => {
      const prompt = await promptAfter([]);

      expect(prompt).not.toContain(historyHeading);
    });

    it("keeps only the most recent failures so the prompt stays bounded", async () => {
      const failures = Array.from({ length: 7 }, (_, index) => ({ from: "qa" as const, reason: `Failure number ${index + 1}` }));

      const prompt = await promptAfter(failures);

      expect(prompt).not.toContain("Failure number 1\n");
      expect(prompt).not.toContain("Attempt 2:");
      expect(prompt).toContain("Attempt 3: Failure number 3");
      expect(prompt).toContain("Attempt 7: Failure number 7");
    });
  });
});

describe("runDevelop project context", () => {
  const contextHeading = "Other files in the project (read-only, do not modify them; import and use their real exports):";
  const siblingsHeading = "Other subtasks of this request";

  const promptFor = async (
    tasks: Task[],
    files: Record<string, string>,
    projectFilesOverride?: { list: () => Promise<never> },
  ): Promise<{ prompt: string; outcomeOk: boolean }> => {
    const prompts: string[] = [];
    const llm = {
      generateJson: async (prompt: string) => {
        prompts.push(prompt);
        return { ok: true as const, json: validOutput };
      },
    };
    const deps = createInMemoryDependencies({ ...developSeed, tasks });
    const workspace = createInMemoryWorkspaceWriter({ "src/app/page.tsx": "export default 'old';", ...files });
    const run = runDevelop({
      ...deps,
      ...inMemoryDevelopDependencies(workspace),
      ...(projectFilesOverride ? { projectFiles: projectFilesOverride } : {}),
      llm,
    });

    const outcome = await run({ kind: "RunDevelop", taskId: "subtask-1" });

    return { prompt: prompts[0], outcomeOk: outcome.ok };
  };

  it("shows the content of an existing project file outside the subtask as read-only context", async () => {
    const { prompt } = await promptFor([subtask()], { "src/weather.ts": "export const getWeather = () => 1;" });

    expect(prompt).toContain(contextHeading);
    expect(prompt).toContain("### src/weather.ts\nexport const getWeather = () => 1;");
  });

  it("does not repeat the files of the subtask in the context section", async () => {
    const { prompt } = await promptFor([subtask()], { "src/weather.ts": "export const w = 1;" });

    const context = prompt.slice(prompt.indexOf(contextHeading));

    expect(context).not.toContain("src/app/page.tsx");
  });

  it("never includes scaffold-only files in the context", async () => {
    const { prompt } = await promptFor([subtask()], {
      "package.json": "{\"name\":\"project\"}",
      "tsconfig.json": "{}",
      "vite.config.ts": "export default {};",
      "index.html": "<html></html>",
      "main.tsx": "render();",
      "src/weather.ts": "export const w = 1;",
    });

    expect(prompt).not.toContain("### package.json");
    expect(prompt).not.toContain("### tsconfig.json");
    expect(prompt).not.toContain("### vite.config.ts");
    expect(prompt).not.toContain("### index.html");
    expect(prompt).not.toContain("### main.tsx");
    expect(prompt).toContain("### src/weather.ts");
  });

  it("keeps App.tsx in the context", async () => {
    const { prompt } = await promptFor([subtask()], { "App.tsx": "export const App = () => null;" });

    expect(prompt).toContain("### App.tsx\nexport const App = () => null;");
  });

  it("skips whole files that do not fit the context budget", async () => {
    const { prompt } = await promptFor([subtask()], {
      "src/a.ts": "a".repeat(20000),
      "src/b.ts": "b".repeat(20000),
      "src/c.ts": "c".repeat(5000),
    });

    expect(prompt).toContain("### src/a.ts");
    expect(prompt).not.toContain("### src/b.ts");
    expect(prompt).toContain("### src/c.ts");
    expect(prompt).not.toContain("b".repeat(100));
  });

  describe("context budget from the client window", () => {
    const filesOfFiveThousand = {
      "src/a.ts": "a".repeat(5000),
      "src/b.ts": "b".repeat(5000),
      "src/c.ts": "c".repeat(5000),
      "src/d.ts": "d".repeat(5000),
      "src/e.ts": "e".repeat(5000),
      "src/f.ts": "f".repeat(5000),
    };

    const contextLengthWith = async (contextWindowTokens: number | undefined): Promise<number> => {
      const prompts: string[] = [];
      const llm: LlmClient = {
        contextWindowTokens,
        generateJson: async (prompt: string) => {
          prompts.push(prompt);
          return { ok: true as const, json: validOutput };
        },
      };
      const deps = createInMemoryDependencies({ ...developSeed, tasks: [subtask()] });
      const workspace = createInMemoryWorkspaceWriter({ "src/app/page.tsx": "export default 'old';", ...filesOfFiveThousand });
      const run = runDevelop({ ...deps, ...inMemoryDevelopDependencies(workspace), llm });

      await run({ kind: "RunDevelop", taskId: "subtask-1" });

      return Object.keys(filesOfFiveThousand).filter((path) => prompts[0].includes(`### ${path}`)).length * 5000;
    };

    it("limits the context to the declared window in characters", async () => {
      expect(await contextLengthWith(8192)).toBe(5000);
    });

    it("keeps the default budget when the client declares no window", async () => {
      expect(await contextLengthWith(undefined)).toBe(30000);
    });

    it("never exceeds the default budget for a larger window", async () => {
      expect(await contextLengthWith(100000)).toBe(30000);
    });
  });

  it("lists the sibling subtasks of the same request with their declared files", async () => {
    const sibling = subtask({ id: "subtask-2", title: "Weather service", files: ["src/weatherService.ts"] });
    const { prompt } = await promptFor([subtask(), sibling], {});

    expect(prompt).toContain(siblingsHeading);
    expect(prompt).toContain("- Weather service (files: src/weatherService.ts)");
  });

  it("does not list the current subtask or subtasks of another parent as siblings", async () => {
    const other = subtask({ id: "subtask-3", title: "Elsewhere", parentTaskId: "parent-2" });
    const { prompt } = await promptFor([subtask(), other], {});

    expect(prompt).not.toContain(siblingsHeading);
    expect(prompt).not.toContain("Elsewhere");
  });

  it("produces no context or sibling sections for a project with no other files and no siblings", async () => {
    const { prompt } = await promptFor([subtask()], {});

    expect(prompt).not.toContain(contextHeading);
    expect(prompt).not.toContain(siblingsHeading);
  });

  it("still runs Develop when listing the project files fails", async () => {
    const failing = {
      list: async (): Promise<never> => {
        throw new Error("disk unavailable");
      },
    };

    const { prompt, outcomeOk } = await promptFor([subtask()], {}, failing);

    expect(outcomeOk).toBe(true);
    expect(prompt).not.toContain(contextHeading);
  });

  it("still rejects writes outside the files of the subtask", async () => {
    const llm = createScriptedLlmClient({ ok: true, json: { files: [{ path: "src/weather.ts", content: "x" }] } });
    const deps = createInMemoryDependencies({ ...developSeed, tasks: [subtask()] });
    const workspace = createInMemoryWorkspaceWriter({ "src/weather.ts": "export const w = 1;" });
    const run = runDevelop({ ...deps, ...inMemoryDevelopDependencies(workspace), llm });

    const outcome = await run({ kind: "RunDevelop", taskId: "subtask-1" });

    expect(outcome.ok).toBe(false);
    expect(workspace.files()["src/weather.ts"]).toBe("export const w = 1;");
  });
});
