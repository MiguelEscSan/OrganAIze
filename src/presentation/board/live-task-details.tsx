"use client";

import { useEffect, useState } from "react";
import type { Task } from "@/domain/tasks/task";
import type { RecordedTaskEvent } from "@/ports/event-log";
import { TaskDetails } from "./task-details";

type LiveTaskDetailsProps = {
  task: Task;
  onClose: () => void;
};

type TaskEventsResponse = { ok: boolean; events?: RecordedTaskEvent[]; reason?: string };

const loadTaskEvents = async (taskId: string): Promise<TaskEventsResponse> => {
  const response = await fetch(`/api/tasks/${taskId}/events`, { cache: "no-store" });

  return (await response.json()) as TaskEventsResponse;
};

export const LiveTaskDetails = ({ task, onClose }: LiveTaskDetailsProps) => {
  const [events, setEvents] = useState<RecordedTaskEvent[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    loadTaskEvents(task.id)
      .then((body) => {
        if (!active) {
          return;
        }

        if (body.ok && body.events) {
          setEvents(body.events);
        } else {
          setLoadError(body.reason ?? "The history could not be loaded");
        }
      })
      .catch(() => {
        if (active) {
          setLoadError("The history could not be loaded");
        }
      });

    return () => {
      active = false;
    };
  }, [task.id]);

  return <TaskDetails task={task} events={events} loadError={loadError} onClose={onClose} />;
};
