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
  onMoveTask: (taskId: string, to: TaskStatus) => void;
};

const userEditableStatuses: readonly TaskStatus[] = ["definition", "ready"];

const subscribeToNothing = () => () => {};
const isClient = () => true;
const isServer = () => false;

export const KanbanBoard = ({
  tasksByStatus,
  onCreateTask,
  onEditTask,
  onDeleteTask,
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

  const columns = (
    <div className="flex gap-4 overflow-x-auto px-6 pb-8 pt-2 md:px-10">
      {boardColumns.map((column) => (
        <KanbanColumn
          key={column.status}
          status={column.status}
          title={column.title}
          accentClass={column.accentClass}
          tasks={tasksByStatus[column.status]}
          isUserEditable={isMounted && userEditableStatuses.includes(column.status)}
          onEdit={onEditTask}
          onDelete={onDeleteTask}
          headerAction={
            column.status === "definition" ? (
              <TaskDialog
                heading="New request"
                submitLabel="Create"
                onSubmit={onCreateTask}
                renderTrigger={(open) => (
                  <button
                    type="button"
                    onClick={open}
                    className="rounded-full bg-ink px-3 py-1 text-xs font-bold text-paper transition-opacity hover:opacity-90"
                  >
                    New request
                  </button>
                )}
              />
            ) : undefined
          }
        />
      ))}
    </div>
  );

  return isMounted ? (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      {columns}
    </DndContext>
  ) : (
    columns
  );
};
