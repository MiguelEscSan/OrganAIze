const absolutePathPattern = /^([A-Za-z]:[\\/]|[\\/])/;

export const isAbsolutePath = (path: string): boolean => absolutePathPattern.test(path.trim());

export const hasParentSegment = (path: string): boolean => path.split(/[\\/]/).includes("..");

export const isInsideRoot = (relativePath: string): boolean => {
  const trimmed = relativePath.trim();

  if (trimmed.length === 0 || isAbsolutePath(trimmed)) {
    return false;
  }

  return !hasParentSegment(trimmed);
};

export const sameLocation = (left: string, right: string): boolean => {
  const normalize = (path: string) => path.trim().replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();

  return normalize(left) === normalize(right);
};
