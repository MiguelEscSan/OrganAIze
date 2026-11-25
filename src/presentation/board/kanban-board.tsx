"use client";

import { useSyncExternalStore } from "react";
import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import type { TasksByStatus } from "@/domain/tasks/group-tasks-by-status";
import type { TaskStatus } from "@/domain/tasks/task-status";
import { boardColumns } from "./board-columns";
import { KanbanColumn } from "./kanban-column";
import { TaskDialog, type TaskDialogValues } from "./task-dialog";

type KanbanBoardProps = {
  tasksByStatus: TasksByStatus;
  onCreateTask: (values: TaskDialogValues) => void;
  onEditTask: (taskId: string, values: TaskDialogValues) => void;
  onDeleteTask: (taskId: string) => void;
  onContinueTask: (taskId: string) => void;
  onSendToReadyTask: (taskId: string) => void;
  onResumeTask?: (taskId: string) => void;
  onBrowserCheckTask?: (taskId: string) => void;
  onMoveTask: (taskId: string, to: TaskStatus) => void;
};

const userEditableStatuses: readonly TaskStatus[] = ["definition", "ready", "review"];

const subscribeToNothing = () => () => {};
const isClient = () => true;
const isServer = () => false;

const PlusIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="size-4"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const KanbanBoard = ({
  tasksByStatus,
  onCreateTask,
  onEditTask,
  onDeleteTask,
  onContinueTask,
  onSendToReadyTask,
  onResumeTask,
  onBrowserCheckTask,
  onMoveTask,
}: KanbanBoardProps) => {
  const isMounted = useSyncExternalStore(subscribeToNothing, isClient, isServer);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const taskId = String(event.active.id);
    const target = event.over?.id as TaskStatus | undefined;
    if (!target || target === event.active.data.current?.status) {
      return;
    }
    onMoveTask(taskId, target);
  };

  const toolbar = (
    <div className="flex justify-end px-6 pt-2 md:px-10">
      <TaskDialog
        heading="New request"
        submitLabel="Create"
        onSubmit={onCreateTask}
        renderTrigger={(open) => (
          <button
            type="button"
            onClick={open}
            className="flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-extrabold text-paper transition-opacity hover:opacity-90"
          >
            <PlusIcon />
            New request
          </button>
        )}
      />
    </div>
  );

  const columns = (
    <div className="flex gap-4 overflow-x-auto px-6 pb-8 pt-2 md:px-10">
      {boardColumns.map((column) => (
        <KanbanColumn
          key={column.status}
          status={column.status}
          title={column.title}
          accentClass={column.accentClass}
          hint={column.hint}
          isAutomatic={column.isAutomatic}
          tasks={tasksByStatus[column.status]}
          tasksByStatus={tasksByStatus}
          isUserEditable={isMounted && userEditableStatuses.includes(column.status)}
          onMoveToReady={(taskId) => onMoveTask(taskId, "ready")}
          onEdit={onEditTask}
          onDelete={onDeleteTask}
          onContinue={onContinueTask}
          onSendToReady={onSendToReadyTask}
          onResume={onResumeTask}
          onBrowserCheck={onBrowserCheckTask}
        />
      ))}
    </div>
  );

  return (
    <>
      {toolbar}
      {isMounted ? (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          {columns}
        </DndContext>
      ) : (
        columns
      )}
    </>
  );
};
