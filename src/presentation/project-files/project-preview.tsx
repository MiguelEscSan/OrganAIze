"use client";

import { Sandpack } from "@codesandbox/sandpack-react";
import type { ProjectFile } from "@/ports/project-files";

type ProjectPreviewProps = {
  files: readonly ProjectFile[];
};

const emptyMessage = "Preview appears once the project has files";

const sandpackFilesOf = (files: readonly ProjectFile[]): Record<string, string> =>
  Object.fromEntries(files.map((file) => [`/${file.path}`, file.content]));

export const ProjectPreview = ({ files }: ProjectPreviewProps) => {
  if (files.length === 0) {
    return <p className="px-6 text-muted md:px-10">{emptyMessage}</p>;
  }

  return (
    <div className="px-6 pb-8 md:px-10">
      <Sandpack
        template="react-ts"
        files={sandpackFilesOf(files)}
        options={{ showConsole: false, showNavigator: false, showTabs: false }}
      />
    </div>
  );
};
