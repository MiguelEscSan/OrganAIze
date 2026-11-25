"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type ProjectTab = "board" | "files" | "preview";

const activeTabOf = (pathname: string): ProjectTab => {
  if (pathname.endsWith("/files")) {
    return "files";
  }

  return pathname.endsWith("/preview") ? "preview" : "board";
};

const tabs: ReadonlyArray<{ tab: ProjectTab; label: string; href: (boardId: string) => string }> = [
  { tab: "board", label: "Board", href: (boardId) => `/projects/${boardId}` },
  { tab: "files", label: "Files", href: (boardId) => `/projects/${boardId}/files` },
  { tab: "preview", label: "Preview", href: (boardId) => `/projects/${boardId}/preview` },
];

export const ProjectTabs = ({ boardId }: { boardId: string }) => {
  const active = activeTabOf(usePathname());

  return (
  <nav aria-label="Project sections" className="px-6 md:px-10">
    <ul className="flex gap-1">
      {tabs.map(({ tab, label, href }) => (
        <li key={tab}>
          <Link
            href={href(boardId)}
            aria-current={tab === active ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm ${
              tab === active
                ? "border-ink bg-paper font-extrabold text-ink"
                : "border-transparent font-bold text-muted hover:bg-cream hover:text-ink"
            }`}
          >
            {label}
          </Link>
        </li>
      ))}
    </ul>
  </nav>
  );
};
