import { isAbsolute, relative } from "node:path";

export const isInsideRoot = (root: string, target: string): boolean => {
  const offset = relative(root, target);

  return offset.length === 0 || (!offset.startsWith("..") && !isAbsolute(offset));
};
