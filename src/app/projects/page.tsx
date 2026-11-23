import { Suspense } from "react";
import { connection } from "next/server";
import { getAppServices } from "@/adapters/server/app-services";
import type { Board } from "@/domain/boards/board";
import { ProjectsContainer } from "@/presentation/projects/projects-container";

type ProjectsView = { boards: Board[]; loadError: string | null };

const loadProjects = async (): Promise<ProjectsView> => {
  try {
    const { mediator } = getAppServices();
    const boards = await mediator.ask<{ kind: "ListBoards" }, Board[]>({ kind: "ListBoards" });

    return { boards, loadError: null };
  } catch (error) {
    return { boards: [], loadError: error instanceof Error ? error.message : "The projects could not be loaded" };
  }
};

const LiveProjects = async () => {
  await connection();
  const { boards, loadError } = await loadProjects();

  return <ProjectsContainer boards={boards} loadError={loadError} />;
};

export default function ProjectsPage() {
  return (
    <Suspense fallback={<p className="p-6 text-muted md:p-10">Loading projects…</p>}>
      <LiveProjects />
    </Suspense>
  );
}
