import type { ProjectFile } from "@/ports/project-files";

export const filesChanged = (previous: readonly ProjectFile[], next: readonly ProjectFile[]): boolean =>
  previous.length !== next.length ||
  previous.some((file, index) => file.path !== next[index]?.path || file.content !== next[index]?.content);
