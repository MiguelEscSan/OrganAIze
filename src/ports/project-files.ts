export type ProjectFile = {
  path: string;
  content: string;
};

export type ProjectFiles = {
  list: (rootPath: string) => Promise<ProjectFile[]>;
};
