export type PlannedWrite = { path: string };

export type FileScopeResult = { ok: true } | { ok: false; reason: string };

const isEscapingPath = (path: string): boolean => {
  const segments = path.split(/[\\/]/);
  const isAbsolute = path.startsWith("/") || path.startsWith("\\") || /^[A-Za-z]:/.test(path);

  return isAbsolute || segments.includes("..");
};

const isMisnamedAppEntry = (path: string): boolean => /(^|[\\/])App\.ts$/.test(path);

export const checkFileScope = (writes: readonly PlannedWrite[], allowedFiles: readonly string[]): FileScopeResult => {
  if (writes.length === 0) {
    return { ok: false, reason: "Develop produced no file changes" };
  }

  const misnamed = writes.find((write) => isMisnamedAppEntry(write.path));

  if (misnamed) {
    return { ok: false, reason: `The app entry must be App.tsx, not App.ts: ${misnamed.path}` };
  }

  const outside = writes.find((write) => isEscapingPath(write.path) || !allowedFiles.includes(write.path));

  if (outside) {
    return { ok: false, reason: `Develop wrote outside its file scope: ${outside.path}` };
  }

  return { ok: true };
};
