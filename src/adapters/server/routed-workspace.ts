import { isStorageLocation } from "@/domain/boards/board";
import type { ProjectFiles } from "@/ports/project-files";
import type { WorkspaceWriter } from "@/ports/workspace-writer";

export const lazily = <T>(create: () => T): (() => T) => {
  let created: { value: T } | null = null;

  return () => {
    created ??= { value: create() };

    return created.value;
  };
};

export const routedWorkspaceFor =
  (
    disk: (location: string) => WorkspaceWriter,
    storage: (location: string) => WorkspaceWriter,
  ): ((location: string) => WorkspaceWriter) =>
  (location) =>
    isStorageLocation(location) ? storage(location) : disk(location);

export const routedProjectFiles = (disk: ProjectFiles, storage: ProjectFiles): ProjectFiles => ({
  list: (location) => (isStorageLocation(location) ? storage.list(location) : disk.list(location)),
});
