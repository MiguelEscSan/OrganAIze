import { workspaceLocationOf } from "@/domain/boards/board";
import type { ArchiveWriter } from "@/ports/archive-writer";
import type { BoardRepository } from "@/ports/board-repository";
import type { ProjectFiles } from "@/ports/project-files";

export type ArchiveProject = {
  kind: "ArchiveProject";
  boardId: string;
};

export type ProjectArchive = {
  filename: string;
  bytes: Uint8Array;
};

export type ArchiveProjectDependencies = {
  boards: BoardRepository;
  projectFiles: ProjectFiles;
  archiveWriter: ArchiveWriter;
};

const fallbackArchiveName = "project";

export const archiveFilenameOf = (projectName: string): string => {
  const slug = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${slug || fallbackArchiveName}.zip`;
};

export const archiveProject =
  (deps: ArchiveProjectDependencies) =>
  async (query: ArchiveProject): Promise<ProjectArchive | null> => {
    const board = (await deps.boards.list()).find((candidate) => candidate.id === query.boardId);

    if (!board) {
      return null;
    }

    const files = await deps.projectFiles.list(workspaceLocationOf(board));

    return { filename: archiveFilenameOf(board.name), bytes: deps.archiveWriter.write(files) };
  };
