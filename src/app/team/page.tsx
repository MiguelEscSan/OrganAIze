import { Suspense } from "react";
import { connection } from "next/server";
import { getAppServices } from "@/adapters/server/app-services";
import { sampleAgents } from "@/adapters/in-memory/sample-agents";
import { developActivity } from "@/domain/agents/develop-activity";
import type { TasksByStatus } from "@/domain/tasks/group-tasks-by-status";
import { TeamList } from "@/presentation/team/team-list";

const allTasks = (tasksByStatus: TasksByStatus) =>
  Object.values(tasksByStatus).flat();

const LiveTeam = async () => {
  await connection();
  const tasksByStatus = await getAppServices()
    .mediator.ask<{ kind: "ListBoard" }, TasksByStatus>({ kind: "ListBoard" })
    .catch(() => null);

  return (
    <TeamList
      agents={sampleAgents}
      activities={tasksByStatus ? { develop: developActivity(allTasks(tasksByStatus)) } : {}}
    />
  );
};

export default function TeamPage() {
  return (
    <Suspense fallback={<TeamList agents={sampleAgents} activities={{}} />}>
      <LiveTeam />
    </Suspense>
  );
}
