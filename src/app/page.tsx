import { Suspense } from "react";
import { connection } from "next/server";
import { getAppServices } from "@/adapters/server/app-services";
import { defaultAppSettings, type AppSettings } from "@/domain/settings/app-settings";
import type { TasksByStatus } from "@/domain/tasks/group-tasks-by-status";
import { BoardContainer } from "@/presentation/board/board-container";

const loadBoard = async (): Promise<{ tasksByStatus: TasksByStatus | null; loadError: string | null }> => {
  try {
    const { mediator } = getAppServices();
    const tasksByStatus = await mediator.ask<{ kind: "ListBoard" }, TasksByStatus>({ kind: "ListBoard" });

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

const LiveBoard = async () => {
  await connection();
  const [{ tasksByStatus, loadError }, autoRefresh] = await Promise.all([loadBoard(), loadAutoRefresh()]);

  return <BoardContainer initialTasksByStatus={tasksByStatus} initialError={loadError} autoRefresh={autoRefresh} />;
};

export default function Home() {
  return (
    <section className="flex flex-col gap-2">
      <header className="flex flex-col gap-1 px-6 pt-6 md:px-10 md:pt-10">
        <h1 className="text-3xl font-extrabold tracking-tight">Board</h1>
        <p className="text-muted">Define a request, send it to Ready, and the agents take it from there.</p>
      </header>
      <Suspense fallback={<p className="px-6 text-muted md:px-10">Loading the board…</p>}>
        <LiveBoard />
      </Suspense>
    </section>
  );
}
