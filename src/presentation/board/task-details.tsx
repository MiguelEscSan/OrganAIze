"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import type { FamilySiblings } from "@/domain/tasks/list-family-siblings";
import type { Task } from "@/domain/tasks/task";
import { maxAttemptsPerTask, type TaskStatus } from "@/domain/tasks/task-status";
import type { RecordedTaskEvent } from "@/ports/event-log";
import { RichTextView } from "../rich-text/rich-text-view";
import { agentChipClass, agentLabel } from "./agent-activity";
import { AttemptDots } from "./attempt-dots";

type TaskDetailsProps = {
  task: Task;
  events: RecordedTaskEvent[] | null;
  loadError: string | null;
  family?: FamilySiblings | null;
  onClose: () => void;
};

const statusLabels: Record<TaskStatus, string> = {
  definition: "Definition",
  ready: "Ready",
  in_progress: "In progress",
  qa: "QA",
  awaiting_release: "Awaiting release",
  review: "Review",
  deploy: "Deploy",
};

const statusChipClasses: Record<TaskStatus, string> = {
  definition: "bg-cream text-ink",
  ready: "bg-cream text-ink",
  in_progress: "bg-sky-soft text-sky-ink",
  qa: "bg-amber-soft text-amber-ink",
  awaiting_release: "bg-amber-soft text-amber-ink",
  review: "bg-terracotta-soft text-terracotta-deep",
  deploy: "bg-sage/15 text-sage-deep",
};

const isOwnedByAgent = (task: Task): boolean => task.status === "in_progress" || task.status === "qa";

const eventDetailLine = (event: RecordedTaskEvent): string =>
  `${new Date(event.at).toLocaleString()} · ${event.from} → ${event.to} · ${event.actor}`;

const iconProps = {
  "aria-hidden": true,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const CloseIcon = () => (
  <svg {...iconProps} className="size-5">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

const LockIcon = () => (
  <svg {...iconProps} className="mt-0.5 size-4 shrink-0">
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

const SectionHeading = ({ children }: { children: ReactNode }) => (
  <h3 className="text-xs font-extrabold uppercase tracking-wide text-muted">{children}</h3>
);

const StatusChip = ({ status }: { status: TaskStatus }) => (
  <span className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${statusChipClasses[status]}`}>
    {statusLabels[status]}
  </span>
);

const LockNotice = () => (
  <p className="flex items-start gap-2 rounded-xl bg-cream px-3.5 py-2.5 text-[13px] text-muted">
    <LockIcon />
    An agent is working on this card, so it is locked. You can edit it again if it returns to Review.
  </p>
);

const FamilyProgress = ({ family }: { family: FamilySiblings }) => (
  <div className="flex flex-col gap-1.5">
    <div
      role="progressbar"
      aria-label="Subtasks deployed"
      aria-valuemin={0}
      aria-valuemax={family.total}
      aria-valuenow={family.deployed}
      className="flex h-2 gap-[3px]"
    >
      {family.siblings.map((sibling) => (
        <span
          key={sibling.id}
          className={`flex-1 rounded-full ${sibling.status === "deploy" ? "bg-sage-deep" : "bg-line"}`}
        />
      ))}
    </div>
    <p className="text-xs font-bold text-muted">
      {family.deployed} of {family.total} deployed
    </p>
  </div>
);

const SiblingList = ({ task, family }: { task: Task; family: FamilySiblings }) => (
  <ul className="flex flex-col gap-1">
    {family.siblings.map((sibling) => {
      const isCurrent = sibling.id === task.id;

      return (
        <li
          key={sibling.id}
          className={`flex items-center justify-between gap-3 rounded-lg px-3 py-1.5 text-[13px] ${
            isCurrent ? "bg-paper font-extrabold" : "font-semibold"
          }`}
        >
          <span>
            {sibling.title}
            {isCurrent && " (this card)"}
          </span>
          <span className="shrink-0 text-xs font-bold text-muted">{statusLabels[sibling.status]}</span>
        </li>
      );
    })}
  </ul>
);

const ParentBlock = ({ task, family }: { task: Task; family: FamilySiblings }) => (
  <section className="flex flex-col gap-3 rounded-xl bg-family/60 p-4">
    <SectionHeading>Part of request</SectionHeading>
    <p className="text-[15px] font-extrabold text-family-ink underline decoration-family-line underline-offset-2">
      {family.title}
    </p>
    <FamilyProgress family={family} />
    <SiblingList task={task} family={family} />
  </section>
);

const AcceptanceCriteria = ({ criteria }: { criteria: readonly string[] }) => (
  <section className="flex flex-col gap-2">
    <SectionHeading>Acceptance criteria</SectionHeading>
    <ul className="flex flex-col gap-2">
      {criteria.map((criterion) => (
        <li key={criterion} className="flex items-start gap-2.5 text-sm leading-relaxed">
          <span aria-hidden="true" className="mt-1.5 size-3 shrink-0 rounded-full border-2 border-muted" />
          {criterion}
        </li>
      ))}
    </ul>
  </section>
);

const AgentStatusCard = ({ task }: { task: Task }) => (
  <section className="flex flex-col gap-3 rounded-xl bg-cream p-4">
    <SectionHeading>Agent status</SectionHeading>
    <p className="self-start">
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${agentChipClass(task.assignedAgent)}`}>
        {task.assignedAgent ? agentLabel(task.assignedAgent) : "Unassigned"}
      </span>
    </p>
    {task.liveStatus && (
      <p className="flex items-center gap-2 text-sm font-bold">
        <span
          aria-hidden="true"
          className="inline-block size-2 shrink-0 animate-pulse rounded-full bg-sky-deep motion-reduce:animate-none"
        />
        {task.liveStatus}
      </p>
    )}
    <div className="flex items-center gap-2 text-xs font-bold text-muted">
      <AttemptDots attempts={task.attempts} />
      {task.attempts} of {maxAttemptsPerTask} attempts used
    </div>
  </section>
);

const EventsSection = ({ events, loadError }: Pick<TaskDetailsProps, "events" | "loadError">) => {
  if (loadError) {
    return <p className="text-sm text-terracotta-deep">{loadError}</p>;
  }

  if (events === null) {
    return <p className="text-sm text-muted">Loading history</p>;
  }

  if (events.length === 0) {
    return <p className="text-sm text-muted">No events yet</p>;
  }

  return (
    <ol className="flex flex-col gap-3">
      {events.map((event, index) => (
        <li key={`${event.at}-${index}`} className="flex flex-col gap-0.5 border-l-2 border-line pl-3">
          <span className="text-[13px] font-extrabold">{event.reason}</span>
          <span className="text-xs text-muted">{eventDetailLine(event)}</span>
        </li>
      ))}
    </ol>
  );
};

const ActivitySection = ({ events, loadError }: Pick<TaskDetailsProps, "events" | "loadError">) => (
  <section className="flex flex-col gap-3 rounded-xl bg-cream p-4">
    <SectionHeading>Activity</SectionHeading>
    <EventsSection events={events} loadError={loadError} />
  </section>
);

export const TaskDetails = ({ task, events, loadError, family = null, onClose }: TaskDetailsProps) => {
  const headingId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const roleLabel = task.parentTaskId !== null ? "Subtask" : "Request";

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      onClose={onClose}
      className="m-auto max-h-[calc(100vh-2rem)] w-[min(860px,calc(100vw-2rem))] rounded-2xl bg-paper p-0 text-ink shadow-xl backdrop:bg-ink/40"
    >
      <div className="flex flex-col gap-5 p-6 md:p-7">
        <header className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip status={task.status} />
              <span className="text-[11px] font-extrabold uppercase tracking-wide text-family-ink">{roleLabel}</span>
            </div>
            <h2 id={headingId} className="text-2xl font-extrabold tracking-tight">
              {task.title}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => dialogRef.current?.close()}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-cream text-ink hover:bg-line"
          >
            <CloseIcon />
          </button>
        </header>

        {isOwnedByAgent(task) && <LockNotice />}

        {family && <ParentBlock task={task} family={family} />}

        <div className="flex flex-wrap gap-5">
          <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-5">
            {task.description.trim() && (
              <section className="flex flex-col gap-2">
                <SectionHeading>Description</SectionHeading>
                <RichTextView html={task.description} className="text-sm leading-relaxed" />
              </section>
            )}

            {task.acceptanceCriteria.length > 0 && <AcceptanceCriteria criteria={task.acceptanceCriteria} />}

            {task.lastFeedback && (
              <section className="flex flex-col gap-2">
                <SectionHeading>Latest feedback from Testing</SectionHeading>
                <p className="whitespace-pre-line rounded-xl bg-terracotta-soft p-3.5 text-sm leading-relaxed">
                  {task.lastFeedback}
                </p>
              </section>
            )}
          </div>

          <aside className="flex flex-[0_0_320px] flex-col gap-4">
            <AgentStatusCard task={task} />
            <ActivitySection events={events} loadError={loadError} />
          </aside>
        </div>
      </div>
    </dialog>
  );
};
