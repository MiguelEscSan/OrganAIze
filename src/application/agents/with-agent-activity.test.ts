import { describe, expect, it } from "vitest";
import type { AgentActivityRecord } from "@/domain/agents/agent-activity";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import { buildTask } from "@/adapters/in-memory/task-fixtures";
import { withAgentActivity } from "./with-agent-activity";

const working: AgentActivityRecord = { agent: "develop", state: "working", message: 'Writing "Hero"' };
const idle: AgentActivityRecord = { agent: "develop", state: "idle", message: "Waiting for a subtask in progress" };

const liveDevelopSubtask = (id: string) =>
  buildTask({ id, status: "in_progress", assignedAgent: "develop", parentTaskId: "parent", liveStatus: "Writing page.tsx" });

const lastRecordOf = async (deps: ReturnType<typeof createInMemoryDependencies>, agent: AgentActivityRecord["agent"]) =>
  (await deps.activity.list()).find((record) => record.agent === agent);

describe("with agent activity", () => {
  it("records the idle message when no other task of the agent is live", async () => {
    const deps = createInMemoryDependencies({ tasks: [buildTask({ id: "mine", status: "in_progress", assignedAgent: "develop" })] });

    await withAgentActivity(deps, working, idle, async () => "done");

    expect(await lastRecordOf(deps, "develop")).toEqual(idle);
  });

  it("keeps the agent working while another subtask of the same agent is still live", async () => {
    const deps = createInMemoryDependencies({ tasks: [liveDevelopSubtask("other")] });

    await withAgentActivity(deps, working, idle, async () => "done");

    expect(await lastRecordOf(deps, "develop")).toEqual({ agent: "develop", state: "working", message: "Working on 1 subtask" });
  });

  it("counts every other live subtask of the agent", async () => {
    const deps = createInMemoryDependencies({ tasks: [liveDevelopSubtask("a"), liveDevelopSubtask("b")] });

    await withAgentActivity(deps, working, idle, async () => "done");

    expect(await lastRecordOf(deps, "develop")).toEqual({ agent: "develop", state: "working", message: "Working on 2 subtasks" });
  });

  it("ignores tasks of the agent that are not live", async () => {
    const quiet = buildTask({ id: "quiet", status: "in_progress", assignedAgent: "develop", liveStatus: null });
    const deps = createInMemoryDependencies({ tasks: [quiet] });

    await withAgentActivity(deps, working, idle, async () => "done");

    expect(await lastRecordOf(deps, "develop")).toEqual(idle);
  });

  it("ignores live tasks that belong to another agent", async () => {
    const reviewed = buildTask({ id: "in-qa", status: "qa", assignedAgent: "develop", liveStatus: "Type-checking page.tsx" });
    const deps = createInMemoryDependencies({ tasks: [reviewed] });

    await withAgentActivity(deps, working, idle, async () => "done");

    expect(await lastRecordOf(deps, "develop")).toEqual(idle);
  });

  it("counts live subtasks in qa as testing work", async () => {
    const reviewing = buildTask({ id: "in-qa", status: "qa", assignedAgent: "develop", liveStatus: "Type-checking page.tsx" });
    const deps = createInMemoryDependencies({ tasks: [reviewing] });
    const testingWorking: AgentActivityRecord = { agent: "testing", state: "reviewing", message: 'Reviewing "Hero"' };
    const testingIdle: AgentActivityRecord = { agent: "testing", state: "idle", message: "Waiting for a subtask in QA" };

    await withAgentActivity(deps, testingWorking, testingIdle, async () => "done");

    expect(await lastRecordOf(deps, "testing")).toEqual({ agent: "testing", state: "reviewing", message: "Working on 1 subtask" });
  });

  it("records the idle message when the run fails and nothing else is live", async () => {
    const deps = createInMemoryDependencies({ tasks: [] });

    await expect(
      withAgentActivity(deps, working, idle, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    expect(await lastRecordOf(deps, "develop")).toEqual(idle);
  });
});
