import { Suspense } from "react";
import { connection } from "next/server";
import { getAppServices } from "@/adapters/server/app-services";
import type { Board } from "@/domain/boards/board";
import { defaultAppSettings, type AppSettings } from "@/domain/settings/app-settings";
import type { TasksByStatus } from "@/domain/tasks/group-tasks-by-status";
import { BoardContainer } from "@/presentation/board/board-container";

type HomeSearchParams = { board?: string | string[] };

type BoardView = {
  boards: Board[];
  boardId: string | null;
  tasksByStatus: TasksByStatus | null;
  loadError: string | null;
};

const readBoardParam = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const loadBoardView = async (boardParam: string | undefined): Promise<BoardView> => {
  try {
    const { mediator } = getAppServices();
    const boards = await mediator.ask<{ kind: "ListBoards" }, Board[]>({ kind: "ListBoards" });
    const selectedBoard = boards.find((board) => board.id === boardParam) ?? boards[0] ?? null;
    const tasksByStatus = await mediator.ask<{ kind: "ListBoard"; boardId?: string }, TasksByStatus>({
      kind: "ListBoard",
      boardId: selectedBoard?.id,
    });

    return { boards, boardId: selectedBoard?.id ?? null, tasksByStatus, loadError: null };
  } catch (error) {
    return {
      boards: [],
      boardId: null,
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

const LiveBoard = async ({ boardParam }: { boardParam: string | undefined }) => {
  await connection();
  const [view, autoRefresh] = await Promise.all([loadBoardView(boardParam), loadAutoRefresh()]);

  return (
    <BoardContainer
      key={view.boardId ?? "no-board"}
      boardId={view.boardId}
      boards={view.boards}
      initialTasksByStatus={view.tasksByStatus}
      initialError={view.loadError}
      autoRefresh={autoRefresh}
    />
  );
};

export default async function Home({ searchParams }: { searchParams: Promise<HomeSearchParams> }) {
  const { board } = await searchParams;

  return (
    <section className="flex flex-col gap-2">
      <header className="flex flex-col gap-1 px-6 pt-6 md:px-10 md:pt-10">
        <h1 className="text-3xl font-extrabold tracking-tight">Board</h1>
        <p className="text-muted">Define a request, send it to Ready, and the agents take it from there.</p>
      </header>
      <Suspense fallback={<p className="px-6 text-muted md:px-10">Loading the board…</p>}>
        <LiveBoard boardParam={readBoardParam(board)} />
      </Suspense>
    </section>
  );
}
