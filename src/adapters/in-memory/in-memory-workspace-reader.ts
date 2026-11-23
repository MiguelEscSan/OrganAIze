import type { WorkspaceReader } from "@/ports/workspace-reader";

export const createInMemoryWorkspaceReader = (files: Record<string, string> = {}): WorkspaceReader => {
  const store = new Map<string, string>(Object.entries(files));

  return {
    read: async (path: string) => store.get(path) ?? null,
  };
};
