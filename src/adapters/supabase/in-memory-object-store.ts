import type { ObjectStore } from "./object-store";

export const createInMemoryObjectStore = (initial: Record<string, string> = {}): ObjectStore & { keys: () => string[] } => {
  const objects = new Map<string, string>(Object.entries(initial));

  return {
    list: async (prefix) => [...objects.keys()].filter((key) => key.startsWith(prefix)),
    download: async (key) => objects.get(key) ?? null,
    upload: async (key, content) => {
      objects.set(key, content);
    },
    keys: () => [...objects.keys()],
  };
};
