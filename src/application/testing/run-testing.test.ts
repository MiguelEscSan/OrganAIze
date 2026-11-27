import { describe, expect, it, vi } from "vitest";
import type { LlmClient, LlmReply } from "@/ports/llm-client";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import { createScriptedLlmClient } from "@/adapters/in-memory/in-memory-llm-client";
import { buildTask } from "@/adapters/in-memory/task-fixtures";
import { createInMemoryWorkspaceReader } from "@/adapters/in-memory/in-memory-workspace-reader";
import { createInMemoryBoardRepository } from "@/adapters/in-memory/in-memory-board-repository";
import { developSeed, inMemoryWorkspaceDependencies } from "@/adapters/in-memory/in-memory-workspace-dependencies";
import { createInMemoryProjectFiles } from "@/adapters/in-memory/in-memory-project-files";
import { createInMemoryProjectTypeChecker } from "@/adapters/in-memory/in-memory-project-type-checker";
import { createInMemoryWorkspaceWriter } from "@/adapters/in-memory/in-memory-workspace-writer";
import type { ProjectFiles } from "@/ports/project-files";
import type { ProjectTypeChecker, TypeFailure } from "@/ports/project-type-checker";
import type { Task } from "@/domain/tasks/task";
import { runTesting } from "./run-testing";

const cardPath = "src/app/card.tsx";
const validCard = "export const Card = () => <section>Title</section>;";
const unclosedCard = ["export const Card = () => (", "  <section>", "    <p>hello</p>", ");"].join("\n");
const passingReview: LlmReply = { ok: true, json: { passed: true, failures: [] } };

const qaTask = (overrides: Partial<Task> = {}): Task =>
  buildTask({
    id: "subtask-1",
    requestId: "request-1",
    parentTaskId: "parent-1",
    status: "qa",
    assignedAgent: "develop",
    files: [cardPath],
    acceptanceCriteria: ["Card shows the title"],
    ...overrides,
  });

const setup = (
  tasks: Task[],
  files: Record<string, string>,
  llm: LlmClient,
  typeChecker: ProjectTypeChecker = createInMemoryProjectTypeChecker(),
  projectFiles: ProjectFiles = createInMemoryProjectFiles(createInMemoryWorkspaceWriter(files)),
) => {
  const deps = createInMemoryDependencies({ ...developSeed, tasks });
  const reader = createInMemoryWorkspaceReader(files);
  const testing = runTesting({ ...deps, ...inMemoryWorkspaceDependencies(reader), llm, typeChecker, projectFiles });

  return { deps, testing };
};

const taskById = async (deps: ReturnType<typeof createInMemoryDependencies>, taskId: string) =>
  (await deps.tasks.list()).find((task) => task.id === taskId);

const reviewingLlm = (reply: LlmReply) => ({
  generateJson: vi.fn<(prompt: string) => Promise<LlmReply>>(async () => reply),
});

describe("runTesting", () => {
  it("sends a task with a missing file back to in progress with a numbered item naming the file", async () => {
    const llm = reviewingLlm(passingReview);
    const { deps, testing } = setup([qaTask()], {}, llm);

    await testing();

    const task = await taskById(deps, "subtask-1");
    expect([task?.status, task?.attempts]).toEqual(["in_progress", 1]);
    expect(task?.lastFeedback).toContain(`1. ${cardPath}: File ${cardPath} does not exist`);
    expect(llm.generateJson).not.toHaveBeenCalled();
  });

  it("sends a task back to in progress with the reason when its board cannot be found", async () => {
    const deps = createInMemoryDependencies({ ...developSeed, tasks: [qaTask()] });
    const testing = runTesting({
      ...deps,
      typeChecker: createInMemoryProjectTypeChecker(),
      projectFiles: { list: async () => [] },
      ...inMemoryWorkspaceDependencies(createInMemoryWorkspaceReader({ [cardPath]: validCard })),
      boards: createInMemoryBoardRepository([]),
      llm: reviewingLlm(passingReview),
    });

    await testing();

    const task = await taskById(deps, "subtask-1");
    expect([task?.status, task?.attempts]).toEqual(["in_progress", 1]);
    expect(task?.lastFeedback).toContain("The board for this task was not found");
  });

  it("sends a task with a tsx syntax error back to in progress with the file and line", async () => {
    const { deps, testing } = setup([qaTask()], { [cardPath]: unclosedCard }, reviewingLlm(passingReview));

    await testing();

    const task = await taskById(deps, "subtask-1");
    expect([task?.status, task?.attempts]).toEqual(["in_progress", 1]);
    expect(task?.lastFeedback).toContain(`1. ${cardPath}:2: Syntax error`);
  });

  it("moves a task that passes the checks and the review to awaiting release", async () => {
    const { deps, testing } = setup([qaTask()], { [cardPath]: validCard }, reviewingLlm(passingReview));

    await testing();

    const task = await taskById(deps, "subtask-1");
    expect([task?.status, task?.attempts]).toEqual(["awaiting_release", 0]);
  });

  it("sends a task that fails the review back to in progress with the failures as numbered feedback", async () => {
    const failingReview: LlmReply = {
      ok: true,
      json: {
        passed: false,
        failures: [
          { criterion: "Card shows the title", file: cardPath, line: 1, message: "The title text is missing" },
        ],
      },
    };
    const { deps, testing } = setup([qaTask()], { [cardPath]: validCard }, reviewingLlm(failingReview));

    await testing();

    const task = await taskById(deps, "subtask-1");
    expect([task?.status, task?.attempts]).toEqual(["in_progress", 1]);
    expect(task?.lastFeedback).toBe(
      `1. Card shows the title (${cardPath}:1): The title text is missing`,
    );
  });

  it.each([
    ["an invalid reply", { ok: true, json: { passed: "yes" } } as LlmReply],
    ["a failed call", { ok: false, reason: "Gemini is unavailable" } as LlmReply],
    [
      "a pass that lists failures",
      { ok: true, json: { passed: true, failures: [{ criterion: "Card shows the title", file: cardPath, line: null, message: "x" }] } } as LlmReply,
    ],
  ])("counts %s as a failed attempt, never as a pass", async (_label, reply) => {
    const { deps, testing } = setup([qaTask()], { [cardPath]: validCard }, reviewingLlm(reply));

    await testing();

    const task = await taskById(deps, "subtask-1");
    expect([task?.status, task?.attempts]).toEqual(["in_progress", 1]);
    expect(task?.lastFeedback).toContain("could not be completed");
  });

  describe("failure kinds", () => {
    const failingReview: LlmReply = {
      ok: true,
      json: {
        passed: false,
        failures: [{ criterion: "Card shows the title", file: cardPath, line: 1, message: "The title text is missing" }],
      },
    };

    it("sends a task to review on a third failed criterion review", async () => {
      const { deps, testing } = setup([qaTask({ attempts: 2 })], { [cardPath]: validCard }, reviewingLlm(failingReview));

      await testing();

      const task = await taskById(deps, "subtask-1");
      expect([task?.status, task?.attempts]).toEqual(["review", 3]);
    });

    it("keeps a task in progress on a third syntax failure", async () => {
      const { deps, testing } = setup([qaTask({ attempts: 2 })], { [cardPath]: unclosedCard }, reviewingLlm(passingReview));

      await testing();

      const task = await taskById(deps, "subtask-1");
      expect([task?.status, task?.attempts]).toEqual(["in_progress", 3]);
    });

    it("keeps a task in progress on a third missing file", async () => {
      const { deps, testing } = setup([qaTask({ attempts: 2 })], {}, reviewingLlm(passingReview));

      await testing();

      expect((await taskById(deps, "subtask-1"))?.status).toBe("in_progress");
    });

    it("keeps a task in progress on a third type check failure", async () => {
      const typeFailures: TypeFailure[] = [{ file: cardPath, line: 1, message: "Cannot find name 'x'" }];
      const { deps, testing } = setup(
        [qaTask({ attempts: 2 })],
        { [cardPath]: validCard },
        reviewingLlm(passingReview),
        createInMemoryProjectTypeChecker(typeFailures),
      );

      await testing();

      expect((await taskById(deps, "subtask-1"))?.status).toBe("in_progress");
    });

    it("keeps a task in progress on a third review that could not be completed", async () => {
      const { deps, testing } = setup(
        [qaTask({ attempts: 2 })],
        { [cardPath]: validCard },
        reviewingLlm({ ok: false, reason: "Gemini is unavailable" }),
      );

      await testing();

      expect((await taskById(deps, "subtask-1"))?.status).toBe("in_progress");
    });

    it("sends a task to review on a sixth review that could not be completed", async () => {
      const { deps, testing } = setup(
        [qaTask({ attempts: 5 })],
        { [cardPath]: validCard },
        reviewingLlm({ ok: false, reason: "Gemini is unavailable" }),
      );

      await testing();

      expect((await taskById(deps, "subtask-1"))?.status).toBe("review");
    });
  });

  it("gives the review the acceptance criteria and the file contents", async () => {
    const llm = reviewingLlm(passingReview);
    const { testing } = setup([qaTask()], { [cardPath]: validCard }, llm);

    await testing();

    const prompt = String(llm.generateJson.mock.calls[0]?.[0]);
    expect(prompt).toContain("Card shows the title");
    expect(prompt).toContain(validCard);
  });

  it("reviews every task in qa", async () => {
    const second = qaTask({ id: "subtask-2", files: ["src/app/other.tsx"] });
    const { deps, testing } = setup(
      [qaTask(), second],
      { [cardPath]: validCard, "src/app/other.tsx": validCard },
      createScriptedLlmClient(passingReview),
    );

    await testing();

    expect((await taskById(deps, "subtask-1"))?.status).toBe("awaiting_release");
    expect((await taskById(deps, "subtask-2"))?.status).toBe("awaiting_release");
  });

  describe("type check", () => {
    const typeFailures: TypeFailure[] = [
      { file: cardPath, line: 1, message: "Cannot find module './weatherService'" },
      { file: cardPath, line: 3, message: "Cannot find name 'PositionError'" },
    ];

    it("sends a task with type failures back to in progress with numbered feedback and skips the review", async () => {
      const llm = reviewingLlm(passingReview);
      const { deps, testing } = setup(
        [qaTask()],
        { [cardPath]: validCard },
        llm,
        createInMemoryProjectTypeChecker(typeFailures),
      );

      await testing();

      const task = await taskById(deps, "subtask-1");
      expect([task?.status, task?.attempts]).toEqual(["in_progress", 1]);
      expect(task?.lastFeedback).toBe(
        [
          `1. Type check (${cardPath}:1): Cannot find module './weatherService'`,
          `2. Type check (${cardPath}:3): Cannot find name 'PositionError'`,
        ].join("\n"),
      );
      expect(llm.generateJson).not.toHaveBeenCalled();
    });

    it("continues to the review and reaches awaiting release when the project type-checks cleanly", async () => {
      const llm = reviewingLlm(passingReview);
      const { deps, testing } = setup([qaTask()], { [cardPath]: validCard }, llm);

      await testing();

      expect((await taskById(deps, "subtask-1"))?.status).toBe("awaiting_release");
      expect(llm.generateJson).toHaveBeenCalledTimes(1);
    });

    it("gives the checker the project files and the task files", async () => {
      const check = vi.fn<ProjectTypeChecker["check"]>(async () => []);
      const { testing } = setup([qaTask()], { [cardPath]: validCard }, reviewingLlm(passingReview), { check });

      await testing();

      expect(check).toHaveBeenCalledWith([{ path: cardPath, content: validCard }], [cardPath]);
    });

    it("still reaches the review when the checker throws", async () => {
      const llm = reviewingLlm(passingReview);
      const throwingChecker: ProjectTypeChecker = {
        check: async () => {
          throw new Error("compiler crashed");
        },
      };
      const { deps, testing } = setup([qaTask()], { [cardPath]: validCard }, llm, throwingChecker);

      await testing();

      expect((await taskById(deps, "subtask-1"))?.status).toBe("awaiting_release");
      expect(llm.generateJson).toHaveBeenCalledTimes(1);
    });

    it("still reaches the review when the project files cannot be listed", async () => {
      const llm = reviewingLlm(passingReview);
      const brokenListing: ProjectFiles = {
        list: async () => {
          throw new Error("disk unavailable");
        },
      };
      const { deps, testing } = setup(
        [qaTask()],
        { [cardPath]: validCard },
        llm,
        createInMemoryProjectTypeChecker(typeFailures),
        brokenListing,
      );

      await testing();

      expect((await taskById(deps, "subtask-1"))?.status).toBe("awaiting_release");
      expect(llm.generateJson).toHaveBeenCalledTimes(1);
    });
  });
});

describe("runTesting live steps", () => {
  const recordLiveStatuses = (deps: ReturnType<typeof createInMemoryDependencies>) => {
    const statuses: (string | null)[] = [];
    const tasks = {
      ...deps.tasks,
      setLiveStatus: async (taskId: string, liveStatus: string | null) => {
        statuses.push(liveStatus);
        await deps.tasks.setLiveStatus(taskId, liveStatus);
      },
    };

    return { deps: { ...deps, tasks }, statuses };
  };

  const runWith = async (files: Record<string, string>, task: Task = qaTask()) => {
    const { deps, statuses } = recordLiveStatuses(createInMemoryDependencies({ ...developSeed, tasks: [task] }));
    const testing = runTesting({
      ...deps,
      ...inMemoryWorkspaceDependencies(createInMemoryWorkspaceReader(files)),
      llm: reviewingLlm(passingReview),
      typeChecker: createInMemoryProjectTypeChecker(),
      projectFiles: createInMemoryProjectFiles(createInMemoryWorkspaceWriter(files)),
    });

    await testing();

    return statuses;
  };

  it("announces reading, the file checks, the type check and the review of the criteria", async () => {
    const statuses = await runWith({ [cardPath]: validCard });

    expect(statuses).toEqual([
      `Reading ${cardPath}`,
      "Running file checks",
      `Type-checking ${cardPath}`,
      `Reviewing the criteria against ${cardPath}`,
      null,
    ]);
  });

  it("stops announcing once the file checks fail and still clears the status", async () => {
    const statuses = await runWith({ [cardPath]: unclosedCard });

    expect(statuses).toEqual([`Reading ${cardPath}`, "Running file checks", null]);
  });

  it("names at most three files and counts the rest", async () => {
    const paths = ["src/a.tsx", "src/b.tsx", "src/c.tsx", "src/d.tsx"];
    const files = Object.fromEntries(paths.map((path) => [path, validCard]));

    const statuses = await runWith(files, qaTask({ files: paths }));

    expect(statuses[0]).toBe("Reading src/a.tsx, src/b.tsx, src/c.tsx and 1 more");
  });
});
