import type { ProjectFiles } from "@/ports/project-files";
import type { InMemoryWorkspace } from "./in-memory-workspace-writer";

export const createInMemoryProjectFiles = (workspace: InMemoryWorkspace): ProjectFiles => ({
  list: async () => Object.entries(workspace.files()).map(([path, content]) => ({ path, content })),
});
