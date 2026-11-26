import { describe, expect, it, vi } from "vitest";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import { buildTask } from "@/adapters/in-memory/task-fixtures";
import { createInMemoryWorkspaceReader } from "@/adapters/in-memory/in-memory-workspace-reader";
import { createInMemoryWorkspaceWriter } from "@/adapters/in-memory/in-memory-workspace-writer";
import { createInMemoryProjectFiles } from "@/adapters/in-memory/in-memory-project-files";
import {
  developSeed,
  inMemoryDevelopDependencies,
  inMemoryScaffoldDependencies,
  inMemoryWorkspaceDependencies,
} from "@/adapters/in-memory/in-memory-workspace-dependencies";
import type { InterfaceProbeResult } from "@/ports/interface-probe";
import type { LlmClient, LlmReply } from "@/ports/llm-client";
import type { Request } from "@/domain/requests/request";
import type { Task } from "@/domain/tasks/task";
import { mergeSharedFile } from "../tasks/merge-shared-file";
import { orchestrateRequest } from "../tasks/orchestrate-request";
import { runDevelop } from "../tasks/run-develop";
import { runRequestQa } from "../testing/run-request-qa";
import { verdictForTask } from "../testing/run-testing";

const stopped: LlmReply = { ok: false, reason: "stop" };

const capturingLlm = (): { llm: LlmClient; prompts: string[] } => {
  const prompts: string[] = [];
  const llm: LlmClient = {
    generateJson: async (prompt) => {
      prompts.push(prompt);
      return stopped;
    },
  };

  return { llm, prompts };
};

const paragraphs = (...parts: string[]): string => parts.join("\n\n");

describe("orchestrator prompt", () => {
  it("is sent word for word", async () => {
    const request: Request = { id: "request-1", boardId: "board-1", title: "Landing", description: "A landing page" };
    const parent = buildTask({ id: "task-1", title: "Landing page", description: "Build the page", status: "in_progress" });
    const deps = createInMemoryDependencies({ requests: [request], tasks: [parent] });
    const { llm, prompts } = capturingLlm();

    await orchestrateRequest({
      ...deps,
      ...inMemoryScaffoldDependencies(createInMemoryWorkspaceWriter()),
      llm,
    })({ kind: "OrchestrateRequest", taskId: "task-1" });

    expect(prompts).toEqual([
      [
        "You split one software request into subtasks for a developer agent.",
        "Request title: Landing",
        "Request description: A landing page",
        "Task title: Landing page",
        "Task description: Build the page",
        "Reply with JSON only, shaped as { subtasks: [{ title, description, acceptanceCriteria: string[], files: string[], runsInParallel: boolean }] }.",
        "Set runsInParallel to true only when the subtask's files do not overlap with any other subtask.",
        "The project is a React app and its scaffold already exists: package.json, tsconfig.json, vite.config.ts, index.html, main entry and App.tsx at the project root. Never plan a subtask that only creates these files.",
        "App.tsx at the project root is the entry of the app. Entry files live at the project root: never plan src/App.tsx.",
        "Every later file grows from App.tsx as in a normal app: a subtask creates a component or module in its own file, and the subtask that uses it adds the import to App.tsx or to a file that App.tsx imports.",
        "Keep subtasks in parallel only when their files do not overlap; the subtask that wires new files into App.tsx must run in sequence.",
      ].join("\n"),
    ]);
  });
});

describe("develop prompt", () => {
  const developPromptFor = async (
    task: Task,
    others: Task[],
    files: Record<string, string>,
    failureReasons: string[] = [],
  ): Promise<string | undefined> => {
    const deps = createInMemoryDependencies({ ...developSeed, tasks: [task, ...others] });
    const { llm, prompts } = capturingLlm();

    for (const reason of failureReasons) {
      await deps.events.append({ taskId: task.id, from: "qa", to: "in_progress", actor: "system", reason });
    }

    await runDevelop({ ...deps, ...inMemoryDevelopDependencies(createInMemoryWorkspaceWriter(files)), llm })({
      kind: "RunDevelop",
      taskId: task.id,
    });

    return prompts[0];
  };

  const closing = [
    "Any file that contains JSX must end in .tsx, never .ts.",
    'Reply with JSON only, in the form {"files":[{"path":"...","content":"full file content"}]}.',
    "Include the full content of every file you change. Do not write any other path.",
  ];

  it("is sent word for word when the subtask has nothing but its own scope", async () => {
    const task = buildTask({
      id: "subtask-1",
      requestId: "request-1",
      status: "in_progress",
      assignedAgent: "develop",
      title: "Hero",
      description: "",
      files: ["src/app/page.tsx"],
      acceptanceCriteria: ["Hero shows the headline"],
    });

    const prompt = await developPromptFor(task, [], { "src/app/page.tsx": "export default 'old';" });

    expect(prompt).toBe(
      paragraphs(
        "Implement this subtask: Hero",
        "",
        "Acceptance criteria:",
        "- Hero shows the headline",
        "You may write only these files: src/app/page.tsx",
        "Current content of those files:",
        "### src/app/page.tsx\nexport default 'old';",
        ...closing,
      ),
    );
  });

  it("is sent word for word with failures, feedback, context files, siblings and a new file", async () => {
    const task = buildTask({
      id: "subtask-1",
      requestId: "request-1",
      parentTaskId: "parent-1",
      status: "in_progress",
      assignedAgent: "develop",
      title: "Hero",
      description: "Render the hero",
      files: ["src/app/page.tsx", "src/app/hero.tsx"],
      acceptanceCriteria: ["Hero shows the headline", "Hero has a button"],
      lastFeedback: "1. src/app/page.tsx: the button is missing",
    });
    const sibling = buildTask({
      id: "subtask-2",
      requestId: "request-1",
      parentTaskId: "parent-1",
      status: "in_progress",
      assignedAgent: "develop",
      title: "Footer",
      files: ["src/app/footer.tsx", "src/app/legal.tsx"],
    });
    const files = { "src/app/page.tsx": "export default 'old';", "src/util.ts": "export const one = 1;" };

    const prompt = await developPromptFor(task, [sibling], files, ["Wrote outside its scope", "Type check failed"]);

    expect(prompt).toBe(
      paragraphs(
        "Implement this subtask: Hero",
        "Render the hero",
        "Acceptance criteria:",
        "- Hero shows the headline",
        "- Hero has a button",
        "Previous failures of this subtask, oldest first; do not repeat any of them:",
        "Attempt 1: Wrote outside its scope",
        "Attempt 2: Type check failed",
        "Feedback from the last review, fix every point:",
        "1. src/app/page.tsx: the button is missing",
        "You may write only these files: src/app/page.tsx, src/app/hero.tsx",
        "Current content of those files:",
        "### src/app/page.tsx\nexport default 'old';",
        "### src/app/hero.tsx\n(new file)",
        "Other files in the project (read-only, do not modify them; import and use their real exports):",
        "### src/util.ts\nexport const one = 1;",
        "Other subtasks of this request (they may write their files at the same time; refer to their files by path):",
        "- Footer (files: src/app/footer.tsx, src/app/legal.tsx)",
        ...closing,
      ),
    );
  });

  it("is sent word for word when the subtask has no files and no criteria", async () => {
    const task = buildTask({
      id: "subtask-1",
      requestId: "request-1",
      status: "in_progress",
      assignedAgent: "develop",
      title: "Empty",
      description: "Nothing",
    });

    const prompt = await developPromptFor(task, [], {});

    expect(prompt).toBe(
      paragraphs(
        "Implement this subtask: Empty",
        "Nothing",
        "Acceptance criteria:",
        "You may write only these files: ",
        "Current content of those files:",
        ...closing,
      ),
    );
  });
});

describe("merge prompt", () => {
  const closing = [
    'Reply with JSON only, in the form {"content": "the full merged file content"}.',
    "Keep every change from both edits. If the edits cannot both hold, keep the proposed file's change and say nothing else.",
  ];

  it("is sent word for word for an existing base", async () => {
    const { llm, prompts } = capturingLlm();

    await mergeSharedFile(
      llm,
      { path: "src/app/page.tsx", base: "export default 1;", current: "export default 1;\nexport const a = 2;", proposed: "export default 3;" },
    );

    expect(prompts).toEqual([
      paragraphs(
        "Merge two independent edits to the file src/app/page.tsx.",
        "Base: the content the editors started from.",
        "### Base\nexport default 1;",
        "### Current file on disk, edited by another subtask\nexport default 1;\nexport const a = 2;",
        "### Proposed file from this subtask\nexport default 3;",
        ...closing,
      ),
    ]);
  });

  it("is sent word for word for a new file", async () => {
    const { llm, prompts } = capturingLlm();

    await mergeSharedFile(
      llm,
      { path: "src/new.ts", base: null, current: "", proposed: "export const b = 1;" },
    );

    expect(prompts).toEqual([
      paragraphs(
        "Merge two independent edits to the file src/new.ts.",
        "Base: the content the editors started from.",
        "### Base\n(new file)",
        "### Current file on disk, edited by another subtask\n",
        "### Proposed file from this subtask\nexport const b = 1;",
        ...closing,
      ),
    ]);
  });
});

describe("subtask testing prompt", () => {
  const cardPath = "src/app/card.tsx";
  const card = "export const Card = () => <section>Title</section>;";

  const reviewPromptFor = async (task: Task, renderedPage?: string): Promise<string | undefined> => {
    const deps = createInMemoryDependencies({ ...developSeed, tasks: [task] });
    const { llm, prompts } = capturingLlm();

    await verdictForTask(
      { ...deps, ...inMemoryWorkspaceDependencies(createInMemoryWorkspaceReader({ [cardPath]: card })), llm },
      task,
      renderedPage,
    );

    return prompts[0];
  };

  const qaTask = buildTask({
    id: "subtask-1",
    requestId: "request-1",
    parentTaskId: "parent-1",
    status: "qa",
    assignedAgent: "develop",
    title: "Card",
    files: [cardPath],
    acceptanceCriteria: ["Card shows the title", "Card is exported"],
  });

  const closing = [
    'Reply with JSON only, in the form {"passed": boolean, "failures": [{"criterion": string, "file": string, "line": number | null, "message": string}]}.',
    "Use passed true with an empty failures list when every criterion holds.",
    "Use passed false with one failure per violated criterion, naming the file and line when possible.",
  ];

  it("is sent word for word without the running app", async () => {
    expect(await reviewPromptFor(qaTask)).toBe(
      paragraphs(
        "Review this subtask against its acceptance criteria and nothing else: Card",
        "Acceptance criteria:",
        "- Card shows the title",
        "- Card is exported",
        "Current content of the files:",
        `### ${cardPath}\n${card}`,
        ...closing,
      ),
    );
  });

  it("is sent word for word with the running app", async () => {
    expect(await reviewPromptFor(qaTask, "Title\nConsole errors:\n- Hydration warning")).toBe(
      paragraphs(
        "Review this subtask against its acceptance criteria and nothing else: Card",
        "Acceptance criteria:",
        "- Card shows the title",
        "- Card is exported",
        "Current content of the files:",
        `### ${cardPath}\n${card}`,
        "Visible text of the running app:",
        "Title\nConsole errors:\n- Hydration warning",
        ...closing,
      ),
    );
  });

  it("keeps the running app section when the page has no text", async () => {
    expect(await reviewPromptFor(qaTask, "")).toBe(
      paragraphs(
        "Review this subtask against its acceptance criteria and nothing else: Card",
        "Acceptance criteria:",
        "- Card shows the title",
        "- Card is exported",
        "Current content of the files:",
        `### ${cardPath}\n${card}`,
        "Visible text of the running app:",
        "",
        ...closing,
      ),
    );
  });
});

describe("request testing prompt", () => {
  const headerPath = "src/header.tsx";
  const listPath = "src/list.tsx";
  const header = "export const Header = () => <h1>Weekly</h1>;";
  const list = "export const List = () => <ul />;";
  const probeResult: InterfaceProbeResult = { ok: true, pageText: "Weekly schedule", consoleErrors: ["Hydration warning"] };

  const requestTask = buildTask({
    id: "request",
    requestId: "request-1",
    status: "in_progress",
    title: "Schedule app",
    description: "A weekly schedule with a header and a list",
  });

  const subtask = (id: string, file: string): Task =>
    buildTask({
      id,
      requestId: "request-1",
      parentTaskId: "request",
      status: "awaiting_release",
      assignedAgent: "develop",
      title: `Subtask ${id}`,
      files: [file],
      acceptanceCriteria: [`${id} criterion`, `${id} second criterion`],
    });

  const reviewPromptFor = async (withProjectFiles: boolean): Promise<string | undefined> => {
    const files = { [headerPath]: header, [listPath]: list };
    const deps = createInMemoryDependencies({ ...developSeed, tasks: [requestTask, subtask("a", headerPath), subtask("b", listPath)] });
    const { llm, prompts } = capturingLlm();

    await runRequestQa({
      ...deps,
      ...inMemoryWorkspaceDependencies(createInMemoryWorkspaceReader(files)),
      projectFiles: withProjectFiles ? createInMemoryProjectFiles(createInMemoryWorkspaceWriter(files)) : { list: async () => [] },
      llm,
      interfaceProbe: { inspect: vi.fn(async () => probeResult) },
      browserCheckEnabled: () => true,
    })({ kind: "RunRequestQa", requestId: "request" });

    return prompts[0];
  };

  const opening = [
    "Review the running app as a whole against this request and nothing else: Schedule app",
    "A weekly schedule with a header and a list",
    "Subtasks of the request and their acceptance criteria:",
    "- Subtask a (files: src/header.tsx)\n  - a criterion\n  - a second criterion",
    "- Subtask b (files: src/list.tsx)\n  - b criterion\n  - b second criterion",
    "Visible text of the running app:",
    "Weekly schedule\nConsole errors:\n- Hydration warning",
  ];

  const closing = [
    'Reply with JSON only, in the form {"passed": boolean, "failures": [{"criterion": string, "file": string | null, "message": string}]}.',
    "Use passed true with an empty failures list when the app fulfils the request and every acceptance criterion holds.",
    "Use passed false with one failure per violated criterion.",
    "In file put the exact project-relative path of the file responsible for the failure when you can tell, otherwise null.",
  ];

  it("is sent word for word with the project files", async () => {
    expect(await reviewPromptFor(true)).toBe(
      paragraphs(
        ...opening,
        "Project files (read-only context):",
        `### ${headerPath}\n${header}`,
        `### ${listPath}\n${list}`,
        ...closing,
      ),
    );
  });

  it("is sent word for word without project files", async () => {
    expect(await reviewPromptFor(false)).toBe(paragraphs(...opening, ...closing));
  });
});
