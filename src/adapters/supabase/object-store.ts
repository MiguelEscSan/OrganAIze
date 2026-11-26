export type ObjectStore = {
  list: (prefix: string) => Promise<string[]>;
  download: (key: string) => Promise<string | null>;
  upload: (key: string, content: string) => Promise<void>;
};
