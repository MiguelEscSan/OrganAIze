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
  renderTrigger: (open: () => void) => ReactNode;
};

const emptyValues: TaskDialogValues = { title: "", description: "" };

export const TaskDialog = ({
  heading,
  submitLabel,
  initialValues = emptyValues,
  onSubmit,
  renderTrigger,
}: TaskDialogProps) => {
  const dialogId = useId();
  const dialogElementId = `${dialogId}-dialog`;
  const [values, setValues] = useState<TaskDialogValues>(initialValues);
  const [session, setSession] = useState(0);

  const isComplete = values.title.trim().length > 0;

  const findDialog = () => document.getElementById(dialogElementId) as HTMLDialogElement | null;

  const open = () => {
    setValues(initialValues);
    setSession((current) => current + 1);
    findDialog()?.showModal();
  };

  const close = () => findDialog()?.close();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isComplete) {
      return;
    }
    onSubmit({ title: values.title.trim(), description: values.description });
    close();
  };

  return (
    <>
      {renderTrigger(open)}
      <dialog
        id={dialogElementId}
        aria-labelledby={`${dialogId}-heading`}
        className="m-auto w-[min(92vw,44rem)] rounded-2xl bg-paper p-0 text-ink shadow-xl backdrop:bg-ink/40"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6 md:p-7">
          <div className="flex items-center justify-between gap-4">
            <span id={`${dialogId}-heading`} className="rounded-md bg-cream px-2 py-0.5 text-xs font-bold text-muted">
              {heading}
            </span>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="rounded-md px-2 py-0.5 text-lg leading-none text-muted hover:text-ink"
            >
              ×
            </button>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="sr-only">Title</span>
            <input
              name="title"
              placeholder="What do you want built?"
              value={values.title}
              onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
              className="rounded-lg border border-transparent bg-transparent px-2 py-1 text-2xl font-extrabold outline-none placeholder:text-muted/60 focus:border-line focus:bg-cream"
            />
          </label>

          <RichTextEditor
            key={session}
            id={`${dialogId}-description`}
            label="Description"
            value={values.description}
            onChange={(html) => setValues((current) => ({ ...current, description: html }))}
            placeholder="Describe what should be built"
          />

          <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
            <button
              type="button"
              onClick={close}
              className="rounded-full px-4 py-2 text-sm font-bold text-muted hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isComplete}
              className="rounded-full bg-terracotta px-5 py-2 text-sm font-bold text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
};
