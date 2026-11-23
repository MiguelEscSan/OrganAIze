import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { WorkspaceFile, WorkspaceWriter } from "@/ports/workspace-writer";
import { isInsideRoot } from "./inside-root";

export const createDiskWorkspaceWriter = (root: string): WorkspaceWriter => {
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
    write: async (files: readonly WorkspaceFile[]) => {
      const targets = files.map((file) => ({ target: resolveInside(file.path), content: file.content }));

      for (const { target, content } of targets) {
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, content, "utf8");
      }
    },
  };
};
