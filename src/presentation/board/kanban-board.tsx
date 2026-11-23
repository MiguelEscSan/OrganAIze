import type { TasksByStatus } from "@/domain/tasks/group-tasks-by-status";
import { boardColumns } from "./board-columns";
import { KanbanColumn } from "./kanban-column";

type KanbanBoardProps = {
  tasksByStatus: TasksByStatus;
};

export const KanbanBoard = ({ tasksByStatus }: KanbanBoardProps) => (
  <div className="flex gap-4 overflow-x-auto px-6 pb-8 pt-2 md:px-10">
    {boardColumns.map((column) => (
      <KanbanColumn
        key={column.status}
        title={column.title}
        accentClass={column.accentClass}
        tasks={tasksByStatus[column.status]}
      />
    ))}
  </div>
);
