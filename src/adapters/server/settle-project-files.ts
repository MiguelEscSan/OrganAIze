import type { ProjectFile } from "@/ports/project-files";

export type ProjectFilesLoad =
  | { kind: "found"; files: ProjectFile[] }
  | { kind: "missing" }
  | { kind: "unavailable"; reason: string };

const unreadableReason = "The project files could not be read";

export const settleProjectFiles = async (load: () => Promise<ProjectFile[] | null>): Promise<ProjectFilesLoad> => {
  try {
    const files = await load();

    return files ? { kind: "found", files } : { kind: "missing" };
  } catch (error) {
    return { kind: "unavailable", reason: error instanceof Error ? error.message : unreadableReason };
  }
};
