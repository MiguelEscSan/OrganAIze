export type PlannedWrite = { path: string };

export type FileScopeResult = { ok: true } | { ok: false; reason: string };

const isEscapingPath = (path: string): boolean => {
  const segments = path.split(/[\\/]/);
  const isAbsolute = path.startsWith("/") || path.startsWith("\\") || /^[A-Za-z]:/.test(path);

  return isAbsolute || segments.includes("..");
};

const isMisnamedAppEntry = (path: string): boolean => /(^|[\\/])App\.ts$/.test(path);

const baseNameOf = (path: string): string => path.slice(path.search(/[^\\/]*$/));

const suggestionFor = (path: string, allowedFiles: readonly string[]): string => {
  const sameName = allowedFiles.filter((allowed) => baseNameOf(allowed) === baseNameOf(path));

  return sameName.length === 1 ? ` Did you mean '${sameName[0]}'?` : "";
};

const outsideScopeReason = (path: string, allowedFiles: readonly string[]): string =>
  `Develop wrote outside its file scope: ${path}. Allowed files: ${allowedFiles.join(", ")}.${suggestionFor(path, allowedFiles)}`;

export const checkFileScope =(writes: readonly PlannedWrite[], allowedFiles: readonly string[]): FileScopeResult => {
  if (writes.length === 0) {
    return { ok: false, reason: "Develop produced no file changes" };
  }

  const misnamed = writes.find((write) => isMisnamedAppEntry(write.path));

  if (misnamed) {
    return { ok: false, reason: `The app entry must be App.tsx, not App.ts: ${misnamed.path}` };
  }

  const outside = writes.find((write) => isEscapingPath(write.path) || !allowedFiles.includes(write.path));

  if (outside) {
    return { ok: false, reason: outsideScopeReason(outside.path, allowedFiles) };
  }

  return { ok: true };
};
