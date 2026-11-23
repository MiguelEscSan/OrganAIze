"use client";

import { useCallback, useEffect, useState } from "react";
import type { TasksByStatus } from "@/domain/tasks/group-tasks-by-status";
import type { Task } from "@/domain/tasks/task";
import type { TaskStatus } from "@/domain/tasks/task-status";
import { sendJson } from "../shared/send-json";
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

type BoardContainerProps = {
  initialTasksByStatus: TasksByStatus | null;
  initialError: string | null;
  autoRefresh: boolean;
};

type BoardResponse = { ok: boolean; reason?: string; tasksByStatus?: TasksByStatus };

const findTask = (tasksByStatus: TasksByStatus, taskId: string): Task | undefined =>
  Object.values(tasksByStatus)
    .flat()
    .find((task) => task.id === taskId);

export const BoardContainer = ({ initialTasksByStatus, initialError, autoRefresh }: BoardContainerProps) => {
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
    if (!autoRefresh) {
      return;
    }

    const timer = setInterval(() => void refresh(), refreshIntervalMs);

    return () => clearInterval(timer);
  }, [autoRefresh, refresh]);

  const runAction = async (outcome: Promise<{ ok: boolean; reason?: string }>, fallbackReason: string) => {
    const result = await outcome;

    setActionError(result.ok ? null : (result.reason ?? fallbackReason));
    await refresh();
  };

  const handleCreateTask = async ({ title, description }: TaskDialogValues) => {
    await runAction(sendJson("POST", "/api/requests", { title, description }), "The request could not be created");
  };

  const handleEditTask = async (taskId: string, { title, description }: TaskDialogValues) => {
    const task = findTask(tasksByStatus, taskId);

    if (!task) {
      setActionError("The request could not be found");
      return;
    }

    await runAction(
      sendJson("PUT", `/api/requests/${task.requestId}`, { title, description }),
      "The request could not be saved",
    );
  };

  const handleDeleteTask = async (taskId: string) => {
    const task = findTask(tasksByStatus, taskId);

    if (!task) {
      setActionError("The task could not be found");
      return;
    }

    const outcome =
      task.status === "definition"
        ? sendJson("DELETE", `/api/requests/${task.requestId}`)
        : sendJson("POST", `/api/tasks/${taskId}/review`, { decision: "delete" });

    await runAction(outcome, "The task could not be deleted");
  };

  const handleContinueTask = async (taskId: string) => {
    await runAction(
      sendJson("POST", `/api/tasks/${taskId}/review`, { decision: "continue" }),
      "The task could not be continued",
    );
  };

  const handleMoveTask = async (taskId: string, to: TaskStatus) => {
    if (to !== "ready" && to !== "definition") {
      setActionError("The system moves tasks after Ready");
      return;
    }

    await runAction(sendJson("POST", `/api/tasks/${taskId}`, { to }), "The task could not be moved");
  };

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
        onEditTask={handleEditTask}
        onDeleteTask={handleDeleteTask}
        onContinueTask={handleContinueTask}
        onMoveTask={handleMoveTask}
      />
    </div>
  );
};
