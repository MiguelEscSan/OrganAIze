import { describe, expect, it } from "vitest";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import { buildTask } from "@/adapters/in-memory/task-fixtures";
import type { AgentActivityRecord } from "@/domain/agents/agent-activity";
import { liveStepsOf, withLiveStatus } from "./live-progress";

const working: AgentActivityRecord = { agent: "develop", state: "working", message: 'Writing "Hero"' };

const setup = () => {
  const deps = createInMemoryDependencies({ tasks: [buildTask({ id: "subtask-1" })] });
  const liveStatus = async () => (await deps.tasks.list()).find((task) => task.id === "subtask-1")?.liveStatus ?? null;
  const developMessage = async () => (await deps.activity.list()).find((record) => record.agent === "develop")?.message;

  return { deps, liveStatus, developMessage, steps: liveStepsOf(deps, "subtask-1", working) };
};

describe("liveStepsOf", () => {
  it("shows an announced step on the task and in the agent activity", async () => {
    const { steps, liveStatus, developMessage } = setup();

    await steps.announce("Reading src/app/page.tsx");

    expect(await liveStatus()).toBe("Reading src/app/page.tsx");
    expect(await developMessage()).toBe("Reading src/app/page.tsx");
  });

  it("keeps the agent and state of the activity it was created with", async () => {
    const { deps, steps } = setup();

    await steps.announce("Checking file scope");

    expect(await deps.activity.list()).toEqual([{ agent: "develop", state: "working", message: "Checking file scope" }]);
  });

  it("replaces the previous step with the next one", async () => {
    const { steps, liveStatus } = setup();

    await steps.announce("Reading src/app/page.tsx");
    await steps.announce("Writing src/app/page.tsx");

    expect(await liveStatus()).toBe("Writing src/app/page.tsx");
  });

  it("appends the streamed detail to the current step instead of replacing it", async () => {
    const { steps, liveStatus, developMessage } = setup();

    await steps.announce("Writing src/app/page.tsx");
    await steps.streamed("600 characters");

    expect(await liveStatus()).toBe("Writing src/app/page.tsx · 600 characters");
    expect(await developMessage()).toBe("Writing src/app/page.tsx · 600 characters");
  });

  it("appends the streamed detail to the activity message when no step was announced yet", async () => {
    const { steps, liveStatus } = setup();

    await steps.streamed("600 characters");

    expect(await liveStatus()).toBe('Writing "Hero" · 600 characters');
  });

  it("drops the streamed detail when the next step is announced", async () => {
    const { steps, liveStatus } = setup();

    await steps.announce("Writing src/app/page.tsx");
    await steps.streamed("600 characters");
    await steps.announce("Checking file scope");

    expect(await liveStatus()).toBe("Checking file scope");
  });
});

describe("withLiveStatus", () => {
  it("clears the live status when the run finishes", async () => {
    const { deps, steps, liveStatus } = setup();

    await withLiveStatus(deps.tasks, "subtask-1", async () => steps.announce("Writing src/app/page.tsx"));

    expect(await liveStatus()).toBeNull();
  });

  it("clears the live status when the run throws", async () => {
    const { deps, steps, liveStatus } = setup();

    const run = withLiveStatus(deps.tasks, "subtask-1", async () => {
      await steps.announce("Writing src/app/page.tsx");
      throw new Error("the model crashed");
    });

    await expect(run).rejects.toThrow("the model crashed");
    expect(await liveStatus()).toBeNull();
  });
});
