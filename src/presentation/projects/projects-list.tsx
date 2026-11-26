import Link from "next/link";
import type { Board } from "@/domain/boards/board";

type ProjectsListProps = {
  boards: readonly Board[];
  onCreate: () => void;
  onEdit: (board: Board) => void;
};

const GearIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
  </svg>
);

export const ProjectsList = ({ boards, onCreate, onEdit }: ProjectsListProps) => (
  <section className="flex flex-col gap-6 p-6 md:p-10">
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight">Projects</h1>
        <p className="text-muted">Each project has its own board and works in its own folder.</p>
      </div>
      <button type="button" onClick={onCreate} className="self-start rounded-lg bg-black/80 px-3 py-2 text-sm text-white md:self-auto">
        New project
      </button>
    </header>
    {boards.length === 0 ? (
      <p className="rounded-2xl bg-paper p-5 text-muted ring-1 ring-line">No projects yet. Create one to open its board.</p>
    ) : (
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {boards.map((board) => (
          <li key={board.id} className="flex items-start gap-2 rounded-2xl bg-paper p-5 shadow-[0_2px_0_var(--color-line)] ring-1 ring-line">
            <Link href={`/projects/${board.id}`} className="flex min-w-0 flex-1 flex-col gap-1">
              <h2 className="text-lg font-bold">{board.name}</h2>
              <p className="truncate text-sm text-muted">{board.rootPath ?? "Cloud storage"}</p>
            </Link>
            <button
              type="button"
              aria-label={`Edit ${board.name}`}
              onClick={() => onEdit(board)}
              className="shrink-0 rounded-lg p-2 text-muted ring-1 ring-line hover:text-black"
            >
              <GearIcon />
            </button>
          </li>
        ))}
      </ul>
    )}
  </section>
);
