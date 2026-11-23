import type { Task } from "@/domain/tasks/task";

type TaskCardProps = {
  task: Task;
};

export const TaskCard = ({ task }: TaskCardProps) => (
  <article className="flex flex-col gap-2.5 rounded-xl bg-paper p-3.5 shadow-[0_1px_0_var(--color-line)] ring-1 ring-line">
    <h3 className="text-sm font-bold leading-snug">{task.title}</h3>
    <p className="text-xs leading-relaxed text-muted">{task.description}</p>
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="rounded-full bg-cream px-2.5 py-0.5 font-semibold capitalize text-ink">
        {task.assignedAgent ?? "Unassigned"}
      </span>
      <span className="font-semibold text-muted">
        {task.attempts}/3 attempts
      </span>
    </div>
    {task.lastFeedback && (
      <p className="rounded-lg bg-terracotta/10 p-2.5 text-xs leading-relaxed text-terracotta">
        <span className="font-bold">Testing: </span>
        {task.lastFeedback}
      </p>
    )}
  </article>
);
