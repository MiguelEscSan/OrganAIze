import type { ProjectArchive } from "@/application/projects/archive-project";
import { getAppServices } from "./app-services";

export const loadProjectArchive = async (boardId: string): Promise<ProjectArchive | null> => {
  const { mediator } = getAppServices();

  return mediator.ask<{ kind: "ArchiveProject"; boardId: string }, ProjectArchive | null>({
    kind: "ArchiveProject",
    boardId,
  });
};
