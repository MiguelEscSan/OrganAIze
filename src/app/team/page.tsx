import { Suspense } from "react";
import { connection } from "next/server";
import { getAppServices } from "@/adapters/server/app-services";
import { sampleAgents } from "@/adapters/in-memory/sample-agents";
import { developActivity } from "@/domain/agents/develop-activity";
import { testingActivity } from "@/domain/agents/testing-activity";
import type { TasksByStatus } from "@/domain/tasks/group-tasks-by-status";
import { TeamList } from "@/presentation/team/team-list";

const allTasks = (tasksByStatus: TasksByStatus) =>
  Object.values(tasksByStatus).flat();

const activitiesOf = (tasksByStatus: TasksByStatus | null) =>
  tasksByStatus
    ? { develop: developActivity(allTasks(tasksByStatus)), testing: testingActivity(allTasks(tasksByStatus)) }
    : {};

const LiveTeam = async () => {
  await connection();
  const tasksByStatus = await getAppServices()
    .mediator.ask<{ kind: "ListBoard" }, TasksByStatus>({ kind: "ListBoard" })
    .catch(() => null);

  return (
    <TeamList
      agents={sampleAgents}
      activities={activitiesOf(tasksByStatus)}
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
