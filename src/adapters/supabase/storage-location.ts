const prefix = "storage:";

export const boardPrefixOf = (location: string): string => {
  if (!location.startsWith(prefix) || location.length === prefix.length) {
    throw new Error(`Not a storage location: ${location}`);
  }

  return `${location.slice(prefix.length)}/`;
};
