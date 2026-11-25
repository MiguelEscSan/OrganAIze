"use client";

import { useDroppable } from "@dnd-kit/core";
import type { ReactNode } from "react";
import { groupColumnIntoFamilies, type FamilySummary } from "@/domain/tasks/group-column-into-families";
import type { TasksByStatus } from "@/domain/tasks/group-tasks-by-status";
import type { Task } from "@/domain/tasks/task";
import type { TaskStatus } from "@/domain/tasks/task-status";
import { RequestFamily } from "./request-family";
import type { TaskDialogValues } from "./task-dialog";
import { TaskCard, type TaskCardVariant } from "./task-card";

type KanbanColumnProps = {
  status: TaskStatus;
  title: string;
  accentClass: string;
  tasks: readonly Task[];
  tasksByStatus: TasksByStatus;
  isUserEditable: boolean;
  headerAction?: ReactNode;
  onMoveToReady?: (taskId: string) => void;
  onEdit?: (taskId: string, values: TaskDialogValues) => void;
  onDelete?: (taskId: string) => void;
  onContinue?: (taskId: string) => void;
  onSendToReady?: (taskId: string) => void;
  onResume?: (taskId: string) => void;
  onBrowserCheck?: (taskId: string) => void;
};

export const KanbanColumn = ({
  status,
  title,
  accentClass,
  tasks,
  tasksByStatus,
  isUserEditable,
  headerAction,
  onMoveToReady,
  onEdit,
  onDelete,
  onContinue,
  onSendToReady,
  onResume,
  onBrowserCheck,
}: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const entries = groupColumnIntoFamilies(status, tasksByStatus);

  const renderCard = (task: Task, variant: TaskCardVariant, summary?: FamilySummary) => (
    <TaskCard
      key={task.id}
      task={task}
      variant={variant}
      subtaskCount={summary?.total}
      summary={summary}
      isDraggable={isUserEditable}
      isEditable={isUserEditable && status === "definition"}
      isDeletable={isUserEditable && (status === "definition" || status === "review")}
      onMoveToReady={onMoveToReady}
      onEdit={onEdit}
      onDelete={onDelete}
      onContinue={onContinue}
      onSendToReady={onSendToReady}
      onResume={onResume}
      onBrowserCheck={onBrowserCheck}
    />
  );

  return (
    <section
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col gap-3 rounded-2xl p-3 ring-1 transition-colors ${
        isOver ? "bg-amber/15 ring-amber" : "bg-cream/70 ring-line"
      }`}
    >
      <header className="flex flex-col gap-2 px-1 pt-1">
        <span className={`h-1.5 w-10 rounded-full ${accentClass}`} aria-hidden="true" />
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold">{title}</h2>
          <div className="flex items-center gap-2">
            {headerAction}
            <span className="rounded-full bg-paper px-2.5 py-0.5 text-xs font-bold text-muted ring-1 ring-line">
              {tasks.length}
            </span>
          </div>
        </div>
      </header>
      {tasks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-xs text-muted">
          Nothing here yet
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {entries.map((entry) =>
            entry.kind === "task" ? (
              <li key={entry.task.id}>{renderCard(entry.task, "standalone")}</li>
            ) : (
              <li key={entry.parentId}>
                <RequestFamily
                  parent={entry.parent ? renderCard(entry.parent, "request", entry.summary) : null}
                  title={entry.summary.title}
                  deployed={entry.summary.deployed}
                  total={entry.summary.total}
                >
                  {entry.children.map((child) => renderCard(child, "subtask"))}
                </RequestFamily>
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  );
};
