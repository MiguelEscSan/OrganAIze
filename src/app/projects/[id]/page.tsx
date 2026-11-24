import { Suspense } from "react";
import { connection } from "next/server";
import { browserCheckEnabled } from "@/adapters/server/browser-check-enabled";
import { getAppServices } from "@/adapters/server/app-services";
import { defaultAppSettings, type AppSettings } from "@/domain/settings/app-settings";
import type { TasksByStatus } from "@/domain/tasks/group-tasks-by-status";
import { BoardContainer } from "@/presentation/board/board-container";

type ProjectPageProps = { params: Promise<{ id: string }> };

type BoardView = {
  tasksByStatus: TasksByStatus | null;
  loadError: string | null;
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

const LiveBoard = async ({ params }: ProjectPageProps) => {
  await connection();
  const { id } = await params;
  const [view, autoRefresh] = await Promise.all([loadBoardView(id), loadAutoRefresh()]);

  return (
    <BoardContainer
      boardId={id}
      initialTasksByStatus={view.tasksByStatus}
      initialError={view.loadError}
      autoRefresh={autoRefresh}
      browserCheckEnabled={browserCheckEnabled()}
    />
  );
};

export default function ProjectPage({ params }: ProjectPageProps) {
  return (
    <Suspense fallback={<p className="px-6 text-muted md:px-10">Loading the board</p>}>
      <LiveBoard params={params} />
    </Suspense>
  );
}
