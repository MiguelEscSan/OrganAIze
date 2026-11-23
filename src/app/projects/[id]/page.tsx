import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getAppServices } from "@/adapters/server/app-services";
import type { Board } from "@/domain/boards/board";
import { defaultAppSettings, type AppSettings } from "@/domain/settings/app-settings";
import type { TasksByStatus } from "@/domain/tasks/group-tasks-by-status";
import { BoardContainer } from "@/presentation/board/board-container";

type ProjectPageProps = { params: Promise<{ id: string }> };

type BoardView = {
  tasksByStatus: TasksByStatus | null;
  loadError: string | null;
};

const findBoard = async (boardId: string): Promise<Board | undefined> => {
  const { mediator } = getAppServices();
  const boards = await mediator.ask<{ kind: "ListBoards" }, Board[]>({ kind: "ListBoards" });

  return boards.find((board) => board.id === boardId);
};

const loadBoardView = async (boardId: string): Promise<BoardView> => {
  try {
    const { mediator } = getAppServices();
    const tasksByStatus = await mediator.ask<{ kind: "ListBoard"; boardId: string }, TasksByStatus>({
      kind: "ListBoard",
      boardId,
    });

    return { tasksByStatus, loadError: null };
  } catch (error) {
    return {
      tasksByStatus: null,
      loadError: error instanceof Error ? error.message : "The board could not be loaded",
    };
  }
};

const loadAutoRefresh = async (): Promise<boolean> => {
  try {
    const { mediator } = getAppServices();
    const settings = await mediator.ask<{ kind: "GetSettings" }, AppSettings>({ kind: "GetSettings" });

    return settings.autoRefresh;
  } catch {
    return defaultAppSettings.autoRefresh;
  }
};

const LiveBoard = async ({ boardId }: { boardId: string }) => {
  const [view, autoRefresh] = await Promise.all([loadBoardView(boardId), loadAutoRefresh()]);

  return (
    <BoardContainer
      boardId={boardId}
      initialTasksByStatus={view.tasksByStatus}
      initialError={view.loadError}
      autoRefresh={autoRefresh}
    />
  );
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  await connection();
  const { id } = await params;
  const board = await findBoard(id);

  if (!board) {
    notFound();
  }

  return (
    <section className="flex flex-col gap-2">
      <header className="flex flex-col gap-1 px-6 pt-6 md:px-10 md:pt-10">
        <Link href="/projects" className="w-fit text-sm text-muted underline-offset-4 hover:underline">
          Back to projects
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight">{board.name}</h1>
        <p className="text-muted">Define a request, send it to Ready, and the agents take it from there.</p>
      </header>
      <Suspense fallback={<p className="px-6 text-muted md:px-10">Loading the board</p>}>
        <LiveBoard boardId={board.id} />
      </Suspense>
    </section>
  );
}
