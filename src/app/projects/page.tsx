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

export default async function ProjectsPage() {
  await connection();
  const { boards, loadError } = await loadProjects();

  return <ProjectsContainer boards={boards} loadError={loadError} />;
}
