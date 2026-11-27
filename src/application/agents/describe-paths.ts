const shownPathCount = 3;

export const describePaths = (paths: readonly string[]): string => {
  if (paths.length === 0) {
    return "no files";
  }

  const shown = paths.slice(0, shownPathCount).join(", ");
  const hiddenCount = paths.length - shownPathCount;

  return hiddenCount > 0 ? `${shown} and ${hiddenCount} more` : shown;
};
