import { scaffoldFiles } from "./scaffold-template";

export type ContextFile = { path: string; content: string };

export const defaultContextBudget = 30000;

const entryPath = "App.tsx";

const scaffoldOnlyPaths: ReadonlySet<string> = new Set(
  scaffoldFiles.map((scaffoldFile) => scaffoldFile.path).filter((path) => path !== entryPath),
);

const byPath = (left: ContextFile, right: ContextFile): number =>
  left.path < right.path ? -1 : left.path > right.path ? 1 : 0;

export const selectContextFiles = (
  projectFiles: readonly ContextFile[],
  ownPaths: readonly string[],
  budget: number,
): ContextFile[] => {
  const excluded = new Set([...ownPaths, ...scaffoldOnlyPaths]);
  const candidates = projectFiles.filter((file) => !excluded.has(file.path)).sort(byPath);
  const selected: ContextFile[] = [];
  let used = 0;

  for (const file of candidates) {
    if (used + file.content.length <= budget) {
      selected.push(file);
      used += file.content.length;
    }
  }

  return selected;
};
