import type { WorkspaceFile, WorkspaceWriter } from "@/ports/workspace-writer";

export type InMemoryWorkspace = WorkspaceWriter & {
  files(): Record<string, string>;
};

export const createInMemoryWorkspaceWriter = (initial: Record<string, string> = {}): InMemoryWorkspace => {
  const store = new Map<string, string>(Object.entries(initial));

  return {
    read: async (path: string) => store.get(path) ?? null,
    write: async (files: readonly WorkspaceFile[]) => {
      files.forEach((file) => store.set(file.path, file.content));
    },
    files: () => Object.fromEntries(store),
  };
};
