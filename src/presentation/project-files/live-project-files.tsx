"use client";

import type { ProjectFile } from "@/ports/project-files";
import { FilesBrowser } from "./files-browser";
import { ProjectPreview } from "./project-preview";
import { useProjectFiles } from "./use-project-files";

type LiveProjectFilesProps = {
  boardId: string;
  initialFiles: ProjectFile[];
};

export const LiveFilesBrowser = ({ boardId, initialFiles }: LiveProjectFilesProps) => {
  const files = useProjectFiles(boardId, initialFiles);

  return <FilesBrowser files={files} />;
};

export const LiveProjectPreview = ({ boardId, initialFiles }: LiveProjectFilesProps) => {
  const files = useProjectFiles(boardId, initialFiles);

  return <ProjectPreview files={files} />;
};
