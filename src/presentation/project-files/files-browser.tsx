"use client";

import { useState } from "react";
import type { ProjectFile } from "@/ports/project-files";

type FilesBrowserProps = {
  files: readonly ProjectFile[];
};

const emptyMessage = "This project has no text files yet";

export const FilesBrowser = ({ files }: FilesBrowserProps) => {
  const [selectedPath, setSelectedPath] = useState<string | null>(files[0]?.path ?? null);
  const selected = files.find((file) => file.path === selectedPath) ?? null;

  if (files.length === 0) {
    return <p className="px-6 text-muted md:px-10">{emptyMessage}</p>;
  }

  return (
    <div className="grid gap-4 px-6 pb-8 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)] md:px-10">
      <ul className="flex flex-col gap-1 rounded-2xl bg-paper p-2 ring-1 ring-line" aria-label="Project files">
        {files.map((file) => (
          <li key={file.path}>
            <button
              type="button"
              onClick={() => setSelectedPath(file.path)}
              aria-current={file.path === selectedPath ? "true" : undefined}
              className={`w-full truncate rounded-lg px-2.5 py-1.5 text-left font-mono text-xs ${
                file.path === selectedPath ? "bg-cream font-bold text-ink" : "text-muted hover:text-ink"
              }`}
            >
              {file.path}
            </button>
          </li>
        ))}
      </ul>
      <pre className="min-w-0 overflow-auto rounded-2xl bg-paper p-4 font-mono text-xs leading-relaxed ring-1 ring-line">
        <code>{selected?.content ?? ""}</code>
      </pre>
    </div>
  );
};
