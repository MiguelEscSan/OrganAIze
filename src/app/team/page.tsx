import { Suspense } from "react";
import { connection } from "next/server";
import { getAppServices } from "@/adapters/server/app-services";
import { sampleAgents } from "@/adapters/in-memory/sample-agents";
import type { AgentActivityRecord } from "@/domain/agents/agent-activity";
import type { AgentName } from "@/domain/agents/agent-name";
import { TeamAutoRefresh } from "@/presentation/team/team-auto-refresh";
import { TeamList } from "@/presentation/team/team-list";

const activitiesByAgent = (records: AgentActivityRecord[]): Partial<Record<AgentName, AgentActivityRecord>> =>
  Object.fromEntries(records.map((record) => [record.agent, record]));

const LiveTeam = async () => {
  await connection();
  const records = await getAppServices()
    .mediator.ask<{ kind: "ListAgentActivity" }, AgentActivityRecord[]>({ kind: "ListAgentActivity" })
    .catch(() => []);

  return (
    <>
      <TeamList agents={sampleAgents} activities={activitiesByAgent(records)} />
      <TeamAutoRefresh />
    </>
  );
};

export default function TeamPage() {
  return (
    <Suspense fallback={<TeamList agents={sampleAgents} activities={{}} />}>
      <LiveTeam />
    </Suspense>
  );
}
