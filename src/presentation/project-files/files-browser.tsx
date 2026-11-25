"use client";

import { useMemo, useState } from "react";
import type { ProjectFile } from "@/ports/project-files";
import { buildFileTree } from "./build-file-tree";
import { FileTree } from "./file-tree";

type FilesBrowserProps = {
  files: readonly ProjectFile[];
};

const emptyMessage = "This project has no text files yet";

export const FilesBrowser = ({ files }: FilesBrowserProps) => {
  const [selectedPath, setSelectedPath] = useState<string | null>(files[0]?.path ?? null);
  const selected = files.find((file) => file.path === selectedPath) ?? null;
  const nodes = useMemo(() => buildFileTree(files.map((file) => file.path)), [files]);

  if (files.length === 0) {
    return <p className="px-6 text-muted md:px-10">{emptyMessage}</p>;
  }

  return (
    <div className="grid gap-4 px-6 pb-8 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)] md:px-10">
      <div className="rounded-2xl bg-paper p-2 ring-1 ring-line">
        <FileTree nodes={nodes} selectedPath={selectedPath} onSelect={setSelectedPath} />
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        {selected ? <p className="truncate font-mono text-xs text-muted">{selected.path}</p> : null}
        <pre className="min-w-0 overflow-auto rounded-2xl bg-paper p-4 font-mono text-xs leading-relaxed ring-1 ring-line">
          <code>{selected?.content ?? ""}</code>
        </pre>
      </div>
    </div>
  );
};
