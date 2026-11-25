import { maxAttemptsPerTask } from "@/domain/tasks/task-status";

type AttemptDotsProps = {
  attempts: number;
};

const dotPositions = Array.from({ length: maxAttemptsPerTask }, (_, position) => position);

export const AttemptDots = ({ attempts }: AttemptDotsProps) => (
  <span role="img" aria-label={`${attempts} of ${maxAttemptsPerTask} attempts used`} className="flex items-center gap-1">
    {dotPositions.map((position) => (
      <span
        key={position}
        aria-hidden="true"
        className={`size-2 rounded-full ${position < attempts ? "bg-terracotta-deep" : "bg-line"}`}
      />
    ))}
  </span>
);
