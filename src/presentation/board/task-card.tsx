"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@/domain/tasks/task";
import { RichTextView } from "../rich-text/rich-text-view";
import { TaskDialog, type TaskDialogValues } from "./task-dialog";

type TaskCardProps = {
  task: Task;
  isDraggable: boolean;
  isEditable: boolean;
  isDeletable: boolean;
  onEdit?: (taskId: string, values: TaskDialogValues) => void;
  onDelete?: (taskId: string) => void;
  onContinue?: (taskId: string) => void;
  onSendToReady?: (taskId: string) => void;
};

export const TaskCard = ({
  task,
  isDraggable,
  isEditable,
  isDeletable,
  onEdit,
  onDelete,
  onContinue,
  onSendToReady,
}: TaskCardProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { status: task.status },
    disabled: !isDraggable,
  });

  const style = { transform: CSS.Translate.toString(transform) };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`flex flex-col gap-2.5 rounded-xl bg-paper p-3.5 shadow-[0_1px_0_var(--color-line)] ring-1 ring-line ${
        isDragging ? "opacity-60 shadow-lg" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        {isDraggable && (
          <button
            type="button"
            aria-label={`Move ${task.title}`}
            {...attributes}
            {...listeners}
            className="mt-0.5 cursor-grab select-none rounded px-0.5 text-muted hover:text-ink active:cursor-grabbing"
          >
            ⠿
          </button>
        )}
        <h3 className="select-none text-sm font-bold leading-snug">{task.title}</h3>
      </div>

      {task.description.trim() && (
        <RichTextView
          html={task.description}
          className={`text-xs leading-relaxed text-muted ${task.status === "review" ? "line-clamp-3" : ""}`}
        />
      )}

      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="rounded-full bg-cream px-2.5 py-0.5 font-semibold capitalize text-ink">
          {task.assignedAgent ?? "Unassigned"}
        </span>
        <span className="font-semibold text-muted">{task.attempts}/3 attempts</span>
      </div>

      {task.lastFeedback && (
        <p className="rounded-lg bg-terracotta/10 p-2.5 text-xs leading-relaxed text-terracotta">
          <span className="font-bold">Testing: </span>
          {task.lastFeedback}
        </p>
      )}

      {task.status === "review" && onSendToReady && (
        <div className="flex justify-end gap-2 border-t border-line pt-2">
          {task.reviewReason === "budget" && onContinue && (
            <button
              type="button"
              onClick={() => onContinue(task.id)}
              className="rounded-full bg-sky px-3 py-1 text-xs font-bold text-paper hover:opacity-90"
            >
              Continue
            </button>
          )}
          <button
            type="button"
            onClick={() => onSendToReady(task.id)}
            className="rounded-full bg-amber px-3 py-1 text-xs font-bold text-ink hover:opacity-90"
          >
            Send to Ready
          </button>
        </div>
      )}

      {(isEditable || isDeletable) && onEdit && onDelete && (
        <div className="flex justify-end gap-2 border-t border-line pt-2">
          {isEditable && (
            <TaskDialog
              heading="Edit request"
              submitLabel="Save"
              initialValues={{ title: task.title, description: task.description }}
              onSubmit={(values) => onEdit(task.id, values)}
              renderTrigger={(open) => (
                <button
                  type="button"
                  onClick={open}
                  className="rounded-full px-3 py-1 text-xs font-bold text-muted hover:bg-cream hover:text-ink"
                >
                  Edit
                </button>
              )}
            />
          )}
          {isDeletable && (
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              className="rounded-full px-3 py-1 text-xs font-bold text-terracotta hover:bg-terracotta/10"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </article>
  );
};
