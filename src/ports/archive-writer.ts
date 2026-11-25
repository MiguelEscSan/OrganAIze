import type { ProjectFile } from "./project-files";

export type ArchiveWriter = {
  write: (files: readonly ProjectFile[]) => Uint8Array;
};
