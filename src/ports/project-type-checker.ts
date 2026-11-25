import type { ProjectFile } from "./project-files";

export type TypeFailure = {
  file: string;
  line: number | null;
  message: string;
};

export type ProjectTypeChecker = {
  check: (files: readonly ProjectFile[], ownPaths: readonly string[]) => Promise<TypeFailure[]>;
};
