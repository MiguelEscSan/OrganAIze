"use client";

import { useEffect, useState } from "react";
import type { ProjectFile } from "@/ports/project-files";
import { filesChanged } from "./files-changed";

const pollIntervalMs = 2000;

type ProjectFilesResponse = { files: ProjectFile[] };

const fetchProjectFiles = async (boardId: string): Promise<ProjectFile[] | null> => {
  const response = await fetch(`/api/boards/${boardId}/files`, { cache: "no-store" });

  if (!response.ok) {
    return null;
  }

  const body = (await response.json()) as ProjectFilesResponse;

  return body.files;
};

export const useProjectFiles = (boardId: string, initialFiles: readonly ProjectFile[]): readonly ProjectFile[] => {
  const [files, setFiles] = useState<readonly ProjectFile[]>(initialFiles);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      try {
        const latest = await fetchProjectFiles(boardId);

        if (active && latest) {
          setFiles((current) => (filesChanged(current, latest) ? latest : current));
        }
      } catch {
        return;
      }
    };

    const timer = setInterval(refresh, pollIntervalMs);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [boardId]);

  return files;
};
