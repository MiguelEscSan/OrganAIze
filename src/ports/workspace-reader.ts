export type WorkspaceReader = {
  read(path: string): Promise<string | null>;
};
