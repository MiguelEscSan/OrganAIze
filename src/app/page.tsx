import { KanbanBoard } from "@/presentation/board/kanban-board";
import { groupTasksByStatus } from "@/domain/tasks/group-tasks-by-status";
import { sampleTasks } from "@/adapters/in-memory/sample-tasks";

export default function Home() {
  const tasksByStatus = groupTasksByStatus(sampleTasks);

  return (
    <section className="flex flex-col gap-2">
      <header className="flex flex-col gap-1 px-6 pt-6 md:px-10 md:pt-10">
        <h1 className="text-3xl font-extrabold tracking-tight">Board</h1>
        <p className="text-muted">Requests become tasks, and each agent moves them forward.</p>
      </header>
      <KanbanBoard tasksByStatus={tasksByStatus} />
    </section>
  );
}
