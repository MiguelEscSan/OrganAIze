import type { ArchiveWriter } from "@/ports/archive-writer";
import type { ProjectFile } from "@/ports/project-files";

export type InMemoryArchiveWriter = ArchiveWriter & { archivedFiles: () => ProjectFile[] };

export const createInMemoryArchiveWriter = (): InMemoryArchiveWriter => {
  let archived: ProjectFile[] = [];

  return {
    write: (files) => {
      archived = [...files];

      return new Uint8Array();
    },
    archivedFiles: () => archived,
  };
};
