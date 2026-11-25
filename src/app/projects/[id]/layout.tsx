import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getAppServices } from "@/adapters/server/app-services";
import type { Board } from "@/domain/boards/board";
import { DownloadProjectLink } from "@/presentation/projects/download-project-link";
import { ProjectTabs } from "@/presentation/projects/project-tabs";

type ProjectLayoutProps = {
  children: ReactNode;
  params: Promise<{ id: string }>;
};

const findBoard = async (boardId: string): Promise<Board | undefined> => {
  const { mediator } = getAppServices();
  const boards = await mediator.ask<{ kind: "ListBoards" }, Board[]>({ kind: "ListBoards" });

  return boards.find((board) => board.id === boardId);
};

const ProjectHeader = async ({ params, children }: ProjectLayoutProps) => {
  await connection();
  const { id } = await params;
  const board = await findBoard(id);

  if (!board) {
    notFound();
  }

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1 px-6 pt-6 md:px-10 md:pt-10">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
          <Link href="/projects" className="text-muted underline underline-offset-4 hover:text-ink">
            Projects
          </Link>
          <span aria-hidden="true" className="text-muted">
            /
          </span>
          <span className="font-bold text-ink">{board.name}</span>
        </nav>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h1 className="text-3xl font-extrabold tracking-tight">{board.name}</h1>
          <DownloadProjectLink href={`/api/boards/${board.id}/download`} />
        </div>
      </header>
      <ProjectTabs boardId={board.id} />
      {children}
    </section>
  );
};

export default function ProjectLayout({ children, params }: ProjectLayoutProps) {
  return (
    <Suspense fallback={<p className="p-6 text-muted md:p-10">Loading the project…</p>}>
      <ProjectHeader params={params}>{children}</ProjectHeader>
    </Suspense>
  );
}
