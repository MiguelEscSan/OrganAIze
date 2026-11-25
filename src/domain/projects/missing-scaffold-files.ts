import { scaffoldFiles, type ScaffoldFile } from "./scaffold-template";

const manifestPath = "package.json";

const normalize = (path: string): string => path.split("\\").join("/");

export const missingScaffoldFiles = (existingPaths: readonly string[]): ScaffoldFile[] => {
  const existing = new Set(existingPaths.map(normalize));

  if (existing.has(manifestPath)) {
    return [];
  }

  return scaffoldFiles.filter((file) => !existing.has(file.path));
};
