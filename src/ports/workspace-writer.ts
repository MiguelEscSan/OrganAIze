export type WorkspaceFile = { path: string; content: string };

export type WorkspaceWriter = {
  read(path: string): Promise<string | null>;
  write(files: readonly WorkspaceFile[]): Promise<void>;
};
