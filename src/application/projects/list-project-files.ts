import type { BoardRepository } from "@/ports/board-repository";
import type { ProjectFile, ProjectFiles } from "@/ports/project-files";

export type ListProjectFiles = {
  kind: "ListProjectFiles";
  boardId: string;
};

export type ProjectFilesDependencies = {
  boards: BoardRepository;
  projectFiles: ProjectFiles;
};

export const listProjectFiles =
  (deps: ProjectFilesDependencies) =>
  async (query: ListProjectFiles): Promise<ProjectFile[] | null> => {
    const board = (await deps.boards.list()).find((candidate) => candidate.id === query.boardId);

    return board ? deps.projectFiles.list(board.rootPath) : null;
  };
