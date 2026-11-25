"use client";

import { useState, type ReactNode } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { FamilySummary } from "@/domain/tasks/group-column-into-families";
import type { ReviewReason, Task } from "@/domain/tasks/task";
import { RichTextView } from "../rich-text/rich-text-view";
import { AgentActivity, agentChipClass, agentLabel } from "./agent-activity";
import { AttemptDots } from "./attempt-dots";
import { CardMenu, type CardMenuItem } from "./card-menu";
import { LiveTaskDetails } from "./live-task-details";
import { RequestProgress } from "./request-progress";
import { TaskDialog, type TaskDialogValues } from "./task-dialog";

export type TaskCardVariant = "request" | "subtask" | "standalone";

type TaskCardProps = {
  task: Task;
  variant?: TaskCardVariant;
  subtaskCount?: number;
  summary?: FamilySummary;
  isDraggable: boolean;
  isEditable: boolean;
  isDeletable: boolean;
  onEdit?: (taskId: string, values: TaskDialogValues) => void;
  onDelete?: (taskId: string) => void;
  onMoveToReady?: (taskId: string) => void;
  onContinue?: (taskId: string) => void;
  onSendToReady?: (taskId: string) => void;
  onResume?: (taskId: string) => void;
  onBrowserCheck?: (taskId: string) => void;
};

const actionBase = "min-h-11 rounded-full px-4 text-[13px] font-extrabold";
const primaryActionClass = `${actionBase} bg-ink text-paper hover:opacity-90`;
const bluePrimaryActionClass = `${actionBase} bg-sky-deep text-paper hover:opacity-90`;
const secondaryActionClass = `${actionBase} border border-line bg-paper text-ink hover:bg-cream`;
const destructiveActionClass = `${actionBase} text-terracotta-deep hover:bg-terracotta-soft`;

const reviewReasonLabels: Record<ReviewReason, string> = {
  budget: "Stopped by time budget",
  attempts: "Too many failed attempts",
  orchestration: "Planning failed",
};

const variantBorderClass = (variant: TaskCardVariant, task: Task): string => {
  if (task.status === "review") {
    return "border-2 border-terracotta-deep";
  }

  return variant === "request" ? "border-2 border-family-line" : "";
};

const variantLabel = (variant: TaskCardVariant, subtaskCount: number | undefined): string | null => {
  if (variant === "subtask") {
    return "Subtask";
  }

  if (variant === "request") {
    return subtaskCount === undefined ? "Request" : `Request · ${subtaskCount} subtasks`;
  }

  return null;
};

const GripIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="currentColor">
    <circle cx="9" cy="6" r="1.6" />
    <circle cx="15" cy="6" r="1.6" />
    <circle cx="9" cy="12" r="1.6" />
    <circle cx="15" cy="12" r="1.6" />
    <circle cx="9" cy="18" r="1.6" />
    <circle cx="15" cy="18" r="1.6" />
  </svg>
);

const ActionRow = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-wrap items-center gap-2 border-t border-line pt-2.5">{children}</div>
);

export const TaskCard = ({
  task,
  variant = "standalone",
  subtaskCount,
  summary,
  isDraggable,
  isEditable,
  isDeletable,
  onEdit,
  onDelete,
  onMoveToReady,
  onContinue,
  onSendToReady,
  onResume,
  onBrowserCheck,
}: TaskCardProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { status: task.status },
    disabled: !isDraggable,
  });

  const [detailsOpen, setDetailsOpen] = useState(false);
  const style = { transform: CSS.Translate.toString(transform) };
  const label = variantLabel(variant, subtaskCount);
  const hasMenu = (isEditable || isDeletable) && Boolean(onEdit) && Boolean(onDelete);
  const showMoveToReady = task.status === "definition" && Boolean(onMoveToReady);

  const menuItems = (openEditDialog?: () => void): CardMenuItem[] => [
    ...(isEditable && openEditDialog ? [{ label: "Edit", onSelect: openEditDialog }] : []),
    ...(isDeletable && onDelete ? [{ label: "Delete", onSelect: () => onDelete(task.id), isDestructive: true }] : []),
  ];

  const renderMenu = () =>
    isEditable && onEdit ? (
      <TaskDialog
        heading="Edit request"
        submitLabel="Save"
        initialValues={{ title: task.title, description: task.description }}
        onSubmit={(values) => onEdit(task.id, values)}
        renderTrigger={(open) => <CardMenu title={task.title} items={menuItems(open)} />}
      />
    ) : (
      <CardMenu title={task.title} items={menuItems()} />
    );

  const isInReview = task.status === "review";
  const showsReviewActions = isInReview && Boolean(onSendToReady);
  const showsResume = task.status === "in_progress" && task.parentTaskId !== null && Boolean(onResume);
  const showsBrowserCheck = task.status === "qa" && Boolean(onBrowserCheck);

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`flex flex-col gap-2.5 rounded-xl bg-paper p-3.5 shadow-[0_1px_0_var(--color-line)] ring-1 ring-line ${variantBorderClass(
        variant,
        task,
      )} ${isDragging ? "opacity-60 shadow-lg" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        {label ? (
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-family-ink">{label}</p>
        ) : (
          <span />
        )}
        <AttemptDots attempts={task.attempts} />
      </div>

      {isInReview && task.reviewReason && (
        <p className="self-start rounded-full bg-terracotta-soft px-2.5 py-0.5 text-xs font-extrabold text-terracotta-deep">
          {reviewReasonLabels[task.reviewReason]}
        </p>
      )}

      <div className="flex items-start gap-1">
        {isDraggable && (
          <button
            type="button"
            aria-label={`Move ${task.title}`}
            {...attributes}
            {...listeners}
            className="-my-2.5 -ml-2.5 flex size-11 shrink-0 cursor-grab select-none items-center justify-center rounded-full text-muted hover:text-ink active:cursor-grabbing"
          >
            <GripIcon />
          </button>
        )}
        <button
          type="button"
          onClick={() => setDetailsOpen(true)}
          className="select-none text-left text-sm font-bold leading-snug hover:underline"
        >
          {task.title}
        </button>
      </div>

      {detailsOpen && <LiveTaskDetails task={task} onClose={() => setDetailsOpen(false)} />}

      <p className="self-start">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${agentChipClass(task.assignedAgent)}`}>
          {task.assignedAgent ? agentLabel(task.assignedAgent) : "Unassigned"}
        </span>
      </p>

      {task.description.trim() && (
        <RichTextView html={task.description} className="line-clamp-3 text-xs leading-relaxed text-muted" />
      )}

      {variant === "request" && summary && summary.total > 0 && <RequestProgress summary={summary} />}

      {task.liveStatus && <AgentActivity agent={task.assignedAgent} liveStatus={task.liveStatus} />}

      {task.lastFeedback && (
        <p className="rounded-lg bg-terracotta-soft p-2.5 text-xs leading-relaxed text-ink">
          <span className="font-extrabold text-terracotta-deep">Testing found issues. </span>
          {task.lastFeedback}
        </p>
      )}

      {showsResume && onResume && (
        <ActionRow>
          <button type="button" onClick={() => onResume(task.id)} className={bluePrimaryActionClass}>
            Resume
          </button>
        </ActionRow>
      )}

      {showsReviewActions && onSendToReady && (
        <ActionRow>
          {task.reviewReason === "budget" && onContinue && (
            <button type="button" onClick={() => onContinue(task.id)} className={bluePrimaryActionClass}>
              Continue
            </button>
          )}
          <button type="button" onClick={() => onSendToReady(task.id)} className={secondaryActionClass}>
            Send to Ready (resets attempts)
          </button>
          {isDeletable && onDelete && (
            <button type="button" onClick={() => onDelete(task.id)} className={destructiveActionClass}>
              Delete
            </button>
          )}
        </ActionRow>
      )}

      {showsBrowserCheck && onBrowserCheck && (
        <ActionRow>
          <button type="button" onClick={() => onBrowserCheck(task.id)} className={secondaryActionClass}>
            Run browser check
          </button>
        </ActionRow>
      )}

      {!isInReview && (showMoveToReady || hasMenu) && (
        <ActionRow>
          {showMoveToReady && onMoveToReady && (
            <button type="button" onClick={() => onMoveToReady(task.id)} className={primaryActionClass}>
              Move to Ready
            </button>
          )}
          {hasMenu && <div className="ml-auto">{renderMenu()}</div>}
        </ActionRow>
      )}

      {isInReview && !showsReviewActions && hasMenu && (
        <ActionRow>
          <div className="ml-auto">{renderMenu()}</div>
        </ActionRow>
      )}
    </article>
  );
};
