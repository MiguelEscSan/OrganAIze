import type { ProjectFile } from "@/ports/project-files";
import { getAppServices } from "./app-services";

export const loadProjectFiles = async (boardId: string): Promise<ProjectFile[] | null> => {
  const { mediator } = getAppServices();

  return mediator.ask<{ kind: "ListProjectFiles"; boardId: string }, ProjectFile[] | null>({
    kind: "ListProjectFiles",
    boardId,
  });
};
