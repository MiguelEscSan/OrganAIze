import { scaffoldFiles } from "@/domain/projects/scaffold-template";
import type { ProjectFile } from "@/ports/project-files";

const previewEntryPath = "App.tsx";

const scaffoldOnlyPaths: ReadonlySet<string> = new Set(
  scaffoldFiles.map((scaffoldFile) => scaffoldFile.path).filter((path) => path !== previewEntryPath),
);

export const previewSourceFilesOf = (files: readonly ProjectFile[]): ProjectFile[] =>
  files.filter((file) => !scaffoldOnlyPaths.has(file.path));
