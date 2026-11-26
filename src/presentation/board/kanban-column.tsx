"use client";

import { useDroppable } from "@dnd-kit/core";
import { describeRequestProgress } from "@/domain/tasks/describe-request-progress";
import { groupColumnIntoFamilies, type FamilySummary } from "@/domain/tasks/group-column-into-families";
import type { TasksByStatus } from "@/domain/tasks/group-tasks-by-status";
import { listFamilySiblings } from "@/domain/tasks/list-family-siblings";
import type { Task } from "@/domain/tasks/task";
import type { TaskStatus } from "@/domain/tasks/task-status";
import { RequestFamily } from "./request-family";
import type { TaskDialogValues } from "./task-dialog";
import { TaskCard, type TaskCardVariant } from "./task-card";

type KanbanColumnProps = {
  status: TaskStatus;
  title: string;
  accentClass: string;
  hint: string;
  isAutomatic: boolean;
  tasks: readonly Task[];
  tasksByStatus: TasksByStatus;
  isUserEditable: boolean;
  onMoveToReady?: (taskId: string) => void;
  onEdit?: (taskId: string, values: TaskDialogValues) => void | Promise<void>;
  onDelete?: (taskId: string) => void;
  onContinue?: (taskId: string) => void;
  onSendToReady?: (taskId: string) => void;
  onResume?: (taskId: string) => void;
  onBrowserCheck?: (taskId: string) => void;
};

const LockIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="size-3.5 shrink-0"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

export const KanbanColumn = ({
  status,
  title,
  accentClass,
  hint,
  isAutomatic,
  tasks,
  tasksByStatus,
  isUserEditable,
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
      family={listFamilySiblings(task, tasksByStatus)}
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
      className={`flex w-80 shrink-0 flex-col gap-3 rounded-2xl p-3 ring-1 transition-colors ${
        isOver ? "bg-amber/15 ring-amber" : "bg-cream/70 ring-line"
      }`}
    >
      <header className="flex flex-col gap-1 px-1 pt-1">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-extrabold">
            <span className={`size-2.5 rounded-[3px] ${accentClass}`} aria-hidden="true" />
            {title}
          </h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
              status === "review" && tasks.length > 0
                ? "bg-terracotta-deep text-paper"
                : "bg-paper text-muted ring-1 ring-line"
            }`}
          >
            {tasks.length}
          </span>
        </div>
        <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
          {isAutomatic && <LockIcon />}
          {hint}
        </p>
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
                  progressLabel={describeRequestProgress({
                    deployed: entry.summary.deployed,
                    awaitingRelease: entry.summary.byStatus.awaiting_release,
                    total: entry.summary.total,
                  })}
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
