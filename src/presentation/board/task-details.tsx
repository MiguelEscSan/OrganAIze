"use client";

import { useEffect, useId, useRef } from "react";
import type { Task } from "@/domain/tasks/task";
import type { RecordedTaskEvent } from "@/ports/event-log";
import { RichTextView } from "../rich-text/rich-text-view";

type TaskDetailsProps = {
  task: Task;
  events: RecordedTaskEvent[] | null;
  loadError: string | null;
  onClose: () => void;
};

const eventLine = (event: RecordedTaskEvent): string =>
  `${new Date(event.at).toLocaleString()} · ${event.from} → ${event.to} · ${event.actor} · ${event.reason}`;

const EventsSection = ({ events, loadError }: Pick<TaskDetailsProps, "events" | "loadError">) => {
  if (loadError) {
    return <p className="text-sm text-terracotta">{loadError}</p>;
  }

  if (events === null) {
    return <p className="text-sm text-muted">Loading history</p>;
  }

  if (events.length === 0) {
    return <p className="text-sm text-muted">No events yet</p>;
  }

  return (
    <ol className="flex flex-col gap-2">
      {events.map((event, index) => (
        <li key={`${event.at}-${index}`} className="rounded-lg bg-cream px-3 py-2 text-xs leading-relaxed">
          {eventLine(event)}
        </li>
      ))}
    </ol>
  );
};

export const TaskDetails = ({ task, events, loadError, onClose }: TaskDetailsProps) => {
  const headingId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      onClose={onClose}
      className="m-auto w-[min(640px,calc(100vw-2rem))] rounded-2xl bg-paper p-0 text-ink shadow-xl backdrop:bg-ink/40"
    >
      <div className="flex flex-col gap-5 p-6">
        <header className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted capitalize">
            {task.status.replace("_", " ")} · {task.attempts}/3 attempts
          </span>
          <h2 id={headingId} className="text-xl font-extrabold tracking-tight">
            {task.title}
          </h2>
        </header>

        {task.description.trim() && (
          <RichTextView html={task.description} className="text-sm leading-relaxed text-muted" />
        )}

        {task.acceptanceCriteria.length > 0 && (
          <section className="flex flex-col gap-1">
            <h3 className="text-sm font-bold">Acceptance criteria</h3>
            <ul className="list-disc pl-5 text-sm text-muted">
              {task.acceptanceCriteria.map((criterion) => (
                <li key={criterion}>{criterion}</li>
              ))}
            </ul>
          </section>
        )}

        {task.lastFeedback && (
          <section className="flex flex-col gap-1">
            <h3 className="text-sm font-bold">Last feedback</h3>
            <p className="rounded-lg bg-terracotta/10 p-2.5 text-sm leading-relaxed text-terracotta">
              {task.lastFeedback}
            </p>
          </section>
        )}

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-bold">History</h3>
          <EventsSection events={events} loadError={loadError} />
        </section>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="rounded-full px-4 py-1.5 text-sm font-bold text-muted hover:bg-cream hover:text-ink"
          >
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
};
