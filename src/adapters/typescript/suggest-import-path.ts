import { posix } from "node:path";

const maximumSuggestions = 3;
const codeFilePattern = /\.(ts|tsx|js|jsx|mjs|cjs|mts|cts)$/;
const declarationFilePattern = /\.d\.(ts|mts|cts)$/;

const withoutExtension = (path: string): string => path.replace(codeFilePattern, "");

const importableName = (path: string): string => {
  const extensionless = withoutExtension(path);

  return extensionless.endsWith("/index") ? extensionless.slice(0, -"/index".length) : extensionless;
};

const lastSegment = (path: string): string => path.slice(path.lastIndexOf("/") + 1);

const specifierBaseName = (specifier: string): string => lastSegment(withoutExtension(specifier));

const isCandidate = (path: string, importingPath: string): boolean =>
  path !== importingPath && codeFilePattern.test(path) && !declarationFilePattern.test(path);

const relativeSpecifier = (importingPath: string, targetPath: string): string => {
  const relative = posix.relative(posix.dirname(importingPath), importableName(targetPath));

  return relative.startsWith(".") ? relative : `./${relative}`;
};

export const suggestImportPaths = (specifier: string, importingPath: string, projectPaths: readonly string[]): string[] => {
  const wanted = specifierBaseName(specifier);

  return projectPaths
    .filter((path) => isCandidate(path, importingPath) && lastSegment(importableName(path)) === wanted)
    .sort()
    .slice(0, maximumSuggestions)
    .map((path) => relativeSpecifier(importingPath, path));
};

export const suggestionSentence = (suggestions: readonly string[]): string =>
  suggestions.length === 0 ? "" : ` Did you mean ${suggestions.map((suggestion) => `'${suggestion}'`).join(", ")}?`;
