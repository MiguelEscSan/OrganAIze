import type { InterfaceProbe } from "@/ports/interface-probe";
import type { Task } from "@/domain/tasks/task";
import { succeed, fail, type Outcome } from "../shared/outcome";
import { rootPathOfTask } from "../shared/task-workspace";
import { submitVerdict, unreviewedVerdict, verdictForTask, type TestingDependencies } from "./run-testing";

export type BrowserCheckDependencies = TestingDependencies & { interfaceProbe: InterfaceProbe };

export type RunBrowserCheck = {
  kind: "RunBrowserCheck";
  taskId: string;
  confirmed: boolean;
};

const queuedTask = async (deps: BrowserCheckDependencies, taskId: string): Promise<Outcome<Task>> => {
  const task = (await deps.tasks.list()).find((candidate) => candidate.id === taskId);

  if (!task) {
    return fail("Task not found");
  }

  return task.status === "qa" ? succeed(task) : fail("Only tasks in QA can run a browser check");
};

export const renderedEvidence = (pageText: string, consoleErrors: readonly string[]): string =>
  consoleErrors.length === 0
    ? pageText
    : [pageText, "Console errors:", ...consoleErrors.map((error) => `- ${error}`)].join("\n");

const renderedPageOf = async (
  deps: BrowserCheckDependencies,
  task: Task,
): Promise<Outcome<string>> => {
  const rootPath = await rootPathOfTask(deps, task);

  if (!rootPath.ok) {
    return fail(rootPath.reason);
  }

  const probe = await deps.interfaceProbe.inspect(rootPath.value);

  return probe.ok ? succeed(renderedEvidence(probe.pageText, probe.consoleErrors)) : fail(probe.reason);
};

const checkAndSubmit = async (deps: BrowserCheckDependencies, task: Task): Promise<void> => {
  const page = await renderedPageOf(deps, task);

  if (!page.ok) {
    await submitVerdict(deps, task, unreviewedVerdict(page.reason));
    return;
  }

  const verdict = await verdictForTask(deps, task, page.value);

  if (verdict.ok) {
    await submitVerdict(deps, task, verdict.value);
  }
};

export const runBrowserCheck =
  (deps: BrowserCheckDependencies) =>
  async (command: RunBrowserCheck): Promise<Outcome<null>> => {
    if (!command.confirmed) {
      return fail("The browser check must be confirmed before it runs");
    }

    const task = await queuedTask(deps, command.taskId);

    if (!task.ok) {
      return fail(task.reason);
    }

    await checkAndSubmit(deps, task.value);

    return succeed(null);
  };
