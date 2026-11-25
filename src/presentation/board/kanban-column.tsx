"use client";

import { useDroppable } from "@dnd-kit/core";
import type { ReactNode } from "react";
import type { Task } from "@/domain/tasks/task";
import type { TaskStatus } from "@/domain/tasks/task-status";
import type { TaskDialogValues } from "./task-dialog";
import { TaskCard } from "./task-card";

type KanbanColumnProps = {
  status: TaskStatus;
  title: string;
  accentClass: string;
  tasks: readonly Task[];
  isUserEditable: boolean;
  headerAction?: ReactNode;
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
  isUserEditable,
  headerAction,
  onEdit,
  onDelete,
  onContinue,
  onSendToReady,
  onResume,
  onBrowserCheck,
}: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: status });

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
          {tasks.map((task) => (
            <li key={task.id}>
              <TaskCard
                task={task}
                isDraggable={isUserEditable}
                isEditable={isUserEditable && status === "definition"}
                isDeletable={isUserEditable && (status === "definition" || status === "review")}
                onEdit={onEdit}
                onDelete={onDelete}
                onContinue={onContinue}
                onSendToReady={onSendToReady}
                onResume={onResume}
                onBrowserCheck={onBrowserCheck}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
