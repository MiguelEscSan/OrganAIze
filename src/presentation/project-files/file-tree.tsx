"use client";

import { useState } from "react";
import type { TreeNode } from "./build-file-tree";

type FileTreeProps = {
  nodes: readonly TreeNode[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
};

type NodeListProps = FileTreeProps & {
  depth: number;
  collapsedPaths: ReadonlySet<string>;
  onToggle: (path: string) => void;
  label?: string;
};

const rowClassName = "flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left text-xs";

const indentation = (depth: number): string => `${0.5 + depth * 1}rem`;

const containsPath = (folderPath: string, path: string | null): boolean =>
  path !== null && path.startsWith(`${folderPath}/`);

const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 16 16"
    className={`size-3.5 shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 3l5 5-5 5" />
  </svg>
);

const FolderIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 16 16"
    className="size-4 shrink-0 text-terracotta"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinejoin="round"
  >
    <path d="M1.75 4.5a1 1 0 011-1h3.1l1.4 1.5h5a1 1 0 011 1v6a1 1 0 01-1 1h-9.5a1 1 0 01-1-1v-7.5z" />
  </svg>
);

const FileIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 16 16"
    className="size-4 shrink-0"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinejoin="round"
  >
    <path d="M4 1.75h5l3 3v8.5a1 1 0 01-1 1H4a1 1 0 01-1-1v-10.5a1 1 0 011-1z" />
    <path d="M9 1.75v3h3" />
  </svg>
);

const NodeList = ({ nodes, depth, selectedPath, onSelect, collapsedPaths, onToggle, label }: NodeListProps) => (
  <ul className="flex flex-col" aria-label={label}>
    {nodes.map((node) => {
      if (node.kind === "file") {
        const isSelected = node.path === selectedPath;

        return (
          <li key={node.path}>
            <button
              type="button"
              onClick={() => onSelect(node.path)}
              aria-current={isSelected ? "true" : undefined}
              style={{ paddingLeft: indentation(depth) }}
              className={`${rowClassName} font-mono ${
                isSelected ? "bg-cream font-bold text-ink" : "text-muted hover:text-ink"
              }`}
            >
              <FileIcon />
              <span className="truncate">{node.name}</span>
            </button>
          </li>
        );
      }

      const isExpanded = !collapsedPaths.has(node.path) || containsPath(node.path, selectedPath);

      return (
        <li key={node.path}>
          <button
            type="button"
            onClick={() => onToggle(node.path)}
            aria-expanded={isExpanded}
            style={{ paddingLeft: indentation(depth) }}
            className={`${rowClassName} font-bold text-ink hover:bg-cream`}
          >
            <ChevronIcon expanded={isExpanded} />
            <FolderIcon />
            <span className="truncate">{node.name}</span>
          </button>
          {isExpanded ? (
            <NodeList
              nodes={node.children}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
              collapsedPaths={collapsedPaths}
              onToggle={onToggle}
            />
          ) : null}
        </li>
      );
    })}
  </ul>
);

export const FileTree = ({ nodes, selectedPath, onSelect }: FileTreeProps) => {
  const [collapsedPaths, setCollapsedPaths] = useState<ReadonlySet<string>>(new Set());

  const toggleFolder = (path: string) =>
    setCollapsedPaths((current) => {
      const next = new Set(current);

      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }

      return next;
    });

  return (
    <NodeList
      nodes={nodes}
      depth={0}
      selectedPath={selectedPath}
      onSelect={onSelect}
      collapsedPaths={collapsedPaths}
      onToggle={toggleFolder}
      label="Project files"
    />
  );
};
