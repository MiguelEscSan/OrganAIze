import type { AgentActivityRecord } from "@/domain/agents/agent-activity";
import { agentNames } from "@/domain/agents/agent-name";
import { agentStates } from "@/domain/agents/agent-activity";
import type { AgentActivityRepository } from "@/ports/agent-activity-repository";
import type { Database } from "./client";
import { agentActivity } from "./schema";

const isAgentName = (value: string): value is AgentActivityRecord["agent"] =>
  (agentNames as readonly string[]).includes(value);

const isAgentState = (value: string): value is AgentActivityRecord["state"] =>
  (agentStates as readonly string[]).includes(value);

export const createDrizzleAgentActivityRepository = (db: Database): AgentActivityRepository => ({
  list: async (): Promise<AgentActivityRecord[]> => {
    const rows = await db.select().from(agentActivity);

    return rows.flatMap((row) =>
      isAgentName(row.agent) && isAgentState(row.state)
        ? [{ agent: row.agent, state: row.state, message: row.message }]
        : [],
    );
  },

  record: async (activity) => {
    await db
      .insert(agentActivity)
      .values(activity)
      .onConflictDoUpdate({
        target: agentActivity.agent,
        set: { state: activity.state, message: activity.message },
      });
  },
});
