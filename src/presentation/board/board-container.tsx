"use client";

import { useCallback, useEffect, useState } from "react";
import type { TasksByStatus } from "@/domain/tasks/group-tasks-by-status";
import type { TaskStatus } from "@/domain/tasks/task-status";
import { KanbanBoard } from "./kanban-board";
import type { TaskDialogValues } from "./task-dialog";

const refreshIntervalMs = 2000;

const emptyBoard: TasksByStatus = {
  definition: [],
  ready: [],
  in_progress: [],
  qa: [],
  review: [],
  deploy: [],
};

const unconnectedNotice = "Editing, deleting and continuing tasks is not connected to the server yet.";

type BoardContainerProps = {
  initialTasksByStatus: TasksByStatus | null;
  initialError: string | null;
};

type BoardResponse = { ok: boolean; reason?: string; tasksByStatus?: TasksByStatus };

const postJson = async (url: string, body: unknown, method: "POST" = "POST"): Promise<BoardResponse> => {
  const response = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  return (await response.json()) as BoardResponse;
};

export const BoardContainer = ({ initialTasksByStatus, initialError }: BoardContainerProps) => {
  const [tasksByStatus, setTasksByStatus] = useState<TasksByStatus>(initialTasksByStatus ?? emptyBoard);
  const [loadError, setLoadError] = useState<string | null>(initialError);
  const [actionError, setActionError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/board", { cache: "no-store" });
      const body = (await response.json()) as BoardResponse;

      if (!response.ok || !body.ok || !body.tasksByStatus) {
        setLoadError(body.reason ?? "The board could not be loaded");
        return;
      }

      setTasksByStatus(body.tasksByStatus);
      setLoadError(null);
    } catch {
      setLoadError("The board could not be loaded");
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => void refresh(), refreshIntervalMs);

    return () => clearInterval(timer);
  }, [refresh]);

  const handleCreateTask = async ({ title, description }: TaskDialogValues) => {
    const body = await postJson("/api/requests", { title, description });

    setActionError(body.ok ? null : (body.reason ?? "The request could not be created"));
    await refresh();
  };

  const handleMoveTask = async (taskId: string, to: TaskStatus) => {
    if (to !== "ready" && to !== "definition") {
      setActionError("The system moves tasks after Ready");
      return;
    }

    const body = await postJson(`/api/tasks/${taskId}`, { to });

    setActionError(body.ok ? null : (body.reason ?? "The task could not be moved"));
    await refresh();
  };

  const notConnected = () => setActionError(unconnectedNotice);

  return (
    <div className="flex flex-col gap-3">
      {loadError ? (
        <p role="alert" className="mx-6 rounded-lg bg-terracotta/10 px-4 py-2 text-sm text-terracotta md:mx-10">
          {loadError}
        </p>
      ) : null}
      {actionError ? (
        <p role="alert" className="mx-6 rounded-lg bg-terracotta/10 px-4 py-2 text-sm text-terracotta md:mx-10">
          {actionError}
        </p>
      ) : null}
      <KanbanBoard
        tasksByStatus={tasksByStatus}
        onCreateTask={handleCreateTask}
        onEditTask={notConnected}
        onDeleteTask={notConnected}
        onContinueTask={notConnected}
        onMoveTask={handleMoveTask}
      />
    </div>
  );
};
