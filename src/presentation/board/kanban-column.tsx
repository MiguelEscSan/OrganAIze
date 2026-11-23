import type { Task } from "@/domain/tasks/task";
import { TaskCard } from "./task-card";

type KanbanColumnProps = {
  title: string;
  accentClass: string;
  tasks: readonly Task[];
};

export const KanbanColumn = ({ title, accentClass, tasks }: KanbanColumnProps) => (
  <section className="flex w-72 shrink-0 flex-col gap-3 rounded-2xl bg-cream/70 p-3 ring-1 ring-line">
    <header className="flex flex-col gap-2 px-1 pt-1">
      <span className={`h-1.5 w-10 rounded-full ${accentClass}`} aria-hidden="true" />
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-extrabold">{title}</h2>
        <span className="rounded-full bg-paper px-2.5 py-0.5 text-xs font-bold text-muted ring-1 ring-line">
          {tasks.length}
        </span>
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
            <TaskCard task={task} />
          </li>
        ))}
      </ul>
    )}
  </section>
);
