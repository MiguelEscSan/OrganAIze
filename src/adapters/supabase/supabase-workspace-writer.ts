import { isInsideRoot } from "@/domain/boards/project-path";
import type { WorkspaceFile, WorkspaceWriter } from "@/ports/workspace-writer";
import type { ObjectStore } from "./object-store";
import { boardPrefixOf } from "./storage-location";

export const createSupabaseWorkspaceWriter = (store: ObjectStore, location: string): WorkspaceWriter => {
  const boardPrefix = boardPrefixOf(location);

  const keyOf = (path: string): string => {
    if (!isInsideRoot(path)) {
      throw new Error(`Path is outside the workspace root: ${path}`);
    }

    return `${boardPrefix}${path.trim().replaceAll("\\", "/")}`;
  };

  return {
    read: async (path) => store.download(keyOf(path)),
    write: async (files: readonly WorkspaceFile[]) => {
      const uploads = files.map((file) => ({ key: keyOf(file.path), content: file.content }));

      for (const { key, content } of uploads) {
        await store.upload(key, content);
      }
    },
  };
};
