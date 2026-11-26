import type { ProjectFile, ProjectFiles } from "@/ports/project-files";
import type { ObjectStore } from "./object-store";
import { boardPrefixOf } from "./storage-location";

const ignoredFolders = new Set(["node_modules", ".git", ".next", "dist", "build"]);
const maxFileBytes = 200_000;

const inIgnoredFolder = (relativePath: string): boolean =>
  relativePath
    .split("/")
    .slice(0, -1)
    .some((segment) => ignoredFolders.has(segment));

const isTextWithinLimit = (content: string): boolean =>
  Buffer.byteLength(content, "utf8") <= maxFileBytes && !content.includes("\u0000");

export const createSupabaseProjectFiles = (store: ObjectStore): ProjectFiles => ({
  list: async (location) => {
    const boardPrefix = boardPrefixOf(location);
    const keys = await store.list(boardPrefix);
    const relativePaths = keys.map((key) => key.slice(boardPrefix.length)).filter((path) => !inIgnoredFolder(path));

    const files = await Promise.all(
      relativePaths.map(async (path): Promise<ProjectFile | null> => {
        const content = await store.download(`${boardPrefix}${path}`);

        return content !== null && isTextWithinLimit(content) ? { path, content } : null;
      }),
    );

    return files.filter((file): file is ProjectFile => file !== null);
  },
});
