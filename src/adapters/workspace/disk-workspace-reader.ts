import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { WorkspaceReader } from "@/ports/workspace-reader";
import { isInsideRoot } from "./inside-root";

export const createDiskWorkspaceReader = (root: string): WorkspaceReader => {
  const absoluteRoot = resolve(root);

  const resolveInside = (path: string): string => {
    const target = resolve(absoluteRoot, path);

    if (!isInsideRoot(absoluteRoot, target)) {
      throw new Error(`Path is outside the workspace root: ${path}`);
    }

    return target;
  };

  return {
    read: async (path: string) => {
      try {
        return await readFile(resolveInside(path), "utf8");
      } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") {
          return null;
        }

        throw error;
      }
    },
  };
};
