"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { RichTextEditor } from "../rich-text/rich-text-editor";

export type TaskDialogValues = {
  title: string;
  description: string;
};

type TaskDialogProps = {
  heading: string;
  submitLabel: string;
  initialValues?: TaskDialogValues;
  onSubmit: (values: TaskDialogValues) => void;
  onDelete?: () => void;
  onSubmitAndMoveToReady?: (values: TaskDialogValues) => void;
  renderTrigger: (open: () => void) => ReactNode;
};

const emptyValues: TaskDialogValues = { title: "", description: "" };

const footerButton = "min-h-11 rounded-full px-5 text-sm font-extrabold";
const cancelClass = `${footerButton} text-muted hover:bg-line hover:text-ink`;
const secondaryClass = `${footerButton} border-2 border-ink bg-paper text-ink hover:bg-cream disabled:opacity-40`;
const primaryClass = `${footerButton} bg-ink text-paper hover:opacity-90 disabled:opacity-40`;
const destructiveClass = `${footerButton} flex items-center gap-2 px-4 text-terracotta-deep hover:bg-terracotta-soft`;

const iconProps = {
  "aria-hidden": true,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  className: "size-4",
} as const;

const CloseIcon = () => (
  <svg {...iconProps} className="size-5">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

const TrashIcon = () => (
  <svg {...iconProps}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </svg>
);

type DeleteControlProps = {
  isConfirming: boolean;
  onAsk: () => void;
  onCancel: () => void;
  onConfirm: () => void;
};

const DeleteControl = ({ isConfirming, onAsk, onCancel, onConfirm }: DeleteControlProps) => {
  if (!isConfirming) {
    return (
      <button type="button" onClick={onAsk} className={destructiveClass}>
        <TrashIcon />
        Delete request
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={onConfirm} className={`${destructiveClass} bg-terracotta-soft`}>
        <TrashIcon />
        Confirm delete
      </button>
      <button type="button" onClick={onCancel} className={cancelClass}>
        Cancel delete
      </button>
    </div>
  );
};

export const TaskDialog = ({
  heading,
  submitLabel,
  initialValues = emptyValues,
  onSubmit,
  onDelete,
  onSubmitAndMoveToReady,
  renderTrigger,
}: TaskDialogProps) => {
  const dialogId = useId();
  const dialogElementId = `${dialogId}-dialog`;
  const [values, setValues] = useState<TaskDialogValues>(initialValues);
  const [session, setSession] = useState(0);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const isComplete = values.title.trim().length > 0;
  const isEditing = initialValues.title.length > 0;

  const findDialog = () => document.getElementById(dialogElementId) as HTMLDialogElement | null;

  const open = () => {
    setValues(initialValues);
    setSession((current) => current + 1);
    setIsConfirmingDelete(false);
    findDialog()?.showModal();
  };

  const close = () => findDialog()?.close();

  const submittedValues = (): TaskDialogValues => ({ title: values.title.trim(), description: values.description });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isComplete) {
      return;
    }
    onSubmit(submittedValues());
    close();
  };

  const handleSubmitAndMoveToReady = () => {
    if (!isComplete || !onSubmitAndMoveToReady) {
      return;
    }
    onSubmitAndMoveToReady(submittedValues());
    close();
  };

  const handleConfirmDelete = () => {
    onDelete?.();
    close();
  };

  return (
    <>
      {renderTrigger(open)}
      <dialog
        id={dialogElementId}
        aria-labelledby={`${dialogId}-heading`}
        className="m-auto w-[min(92vw,44rem)] overflow-hidden rounded-2xl bg-paper p-0 text-ink shadow-xl backdrop:bg-ink/40"
      >
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="flex flex-col gap-5 p-6 md:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                {isEditing && <p className="text-xs font-extrabold uppercase tracking-wide text-plum">Definition</p>}
                <h2 id={`${dialogId}-heading`} className="text-[22px] font-extrabold tracking-tight">
                  {heading}
                </h2>
                <p className="text-[13px] text-muted">
                  The Orchestrator reads this text to plan the subtasks. Be specific about what must work.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-cream text-ink hover:bg-line"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${dialogId}-title`} className="text-sm font-semibold">
                Title
              </label>
              <p id={`${dialogId}-title-help`} className="text-xs text-muted">
                A short name for the card.
              </p>
              <input
                id={`${dialogId}-title`}
                name="title"
                aria-describedby={`${dialogId}-title-help`}
                placeholder="What do you want built?"
                value={values.title}
                onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
                className="min-h-12 rounded-xl border-2 border-ink bg-paper px-3.5 text-[15px] font-bold outline-none placeholder:font-normal placeholder:text-muted focus:border-terracotta"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <RichTextEditor
                key={session}
                id={`${dialogId}-description`}
                label="Description"
                value={values.description}
                onChange={(html) => setValues((current) => ({ ...current, description: html }))}
                placeholder="Describe what should be built"
              />
              <p className="text-xs text-muted">Tip: list the acceptance criteria. Testing judges only against them.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-cream px-7 py-4">
            <div>
              {isEditing && onDelete && (
                <DeleteControl
                  isConfirming={isConfirmingDelete}
                  onAsk={() => setIsConfirmingDelete(true)}
                  onCancel={() => setIsConfirmingDelete(false)}
                  onConfirm={handleConfirmDelete}
                />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={close} className={cancelClass}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isComplete}
                className={isEditing && onSubmitAndMoveToReady ? secondaryClass : primaryClass}
              >
                {submitLabel}
              </button>
              {isEditing && onSubmitAndMoveToReady && (
                <button type="button" disabled={!isComplete} onClick={handleSubmitAndMoveToReady} className={primaryClass}>
                  Save and move to Ready
                </button>
              )}
            </div>
          </div>
        </form>
      </dialog>
    </>
  );
};
