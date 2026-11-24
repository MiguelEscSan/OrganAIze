import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { ProjectFile, ProjectFiles } from "@/ports/project-files";

const ignoredFolders = new Set(["node_modules", ".git", ".next", "dist", "build"]);
const maxFileBytes = 200_000;

const readTextFile = async (absolutePath: string): Promise<string | null> => {
  const content = await readFile(absolutePath);

  return content.length > maxFileBytes || content.includes(0) ? null : content.toString("utf8");
};

const collect = async (root: string, relative: string): Promise<ProjectFile[]> => {
  const entries = await readdir(path.join(root, relative), { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = relative === "" ? entry.name : `${relative}/${entry.name}`;

      if (entry.isDirectory()) {
        return ignoredFolders.has(entry.name) ? [] : collect(root, entryPath);
      }

      const content = await readTextFile(path.join(root, entryPath));

      return content === null ? [] : [{ path: entryPath, content }];
    }),
  );

  return nested.flat();
};

export const createDiskProjectFiles = (): ProjectFiles => ({
  list: (rootPath) => collect(rootPath, ""),
});
