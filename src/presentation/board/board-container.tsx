"use client";

import { useState } from "react";
import type { Task } from "@/domain/tasks/task";
import type { TaskStatus } from "@/domain/tasks/task-status";
import { groupTasksByStatus } from "@/domain/tasks/group-tasks-by-status";
import { transitionTask } from "@/domain/tasks/transition-task";
import { deleteTask, editTaskDetails } from "@/domain/tasks/edit-task";
import { KanbanBoard } from "./kanban-board";
import type { TaskDialogValues } from "./task-dialog";

type BoardContainerProps = {
  initialTasks: readonly Task[];
};

export const BoardContainer = ({ initialTasks }: BoardContainerProps) => {
  const [tasks, setTasks] = useState<readonly Task[]>(initialTasks);

  const handleCreateTask = ({ title, description }: TaskDialogValues) => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      requestId: crypto.randomUUID(),
      title,
      description,
      status: "definition",
      assignedAgent: null,
      attempts: 0,
      lastFeedback: null,
    };
    setTasks((current) => [...current, newTask]);
  };

  const handleEditTask = (taskId: string, values: TaskDialogValues) => {
    const result = editTaskDetails(tasks, taskId, values);
    if (result.ok) {
      setTasks(result.tasks);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    const result = deleteTask(tasks, taskId);
    if (result.ok) {
      setTasks(result.tasks);
    }
  };

  const handleMoveTask = (taskId: string, to: TaskStatus) => {
    const result = transitionTask(tasks, taskId, to, "user");
    if (result.ok) {
      setTasks(result.tasks);
    }
  };

  return (
    <KanbanBoard
      tasksByStatus={groupTasksByStatus(tasks)}
      onCreateTask={handleCreateTask}
      onEditTask={handleEditTask}
      onDeleteTask={handleDeleteTask}
      onMoveTask={handleMoveTask}
    />
  );
};
