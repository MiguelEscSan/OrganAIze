import { shownAttemptLimit } from "@/domain/tasks/failure-kind";

type AttemptDotsProps = {
  attempts: number;
};

export const AttemptDots = ({ attempts }: AttemptDotsProps) => {
  const limit = shownAttemptLimit(attempts);
  const dotPositions = Array.from({ length: limit }, (_, position) => position);

  return (
    <span role="img" aria-label={`${attempts} of ${limit} attempts used`} className="flex items-center gap-1">
      {dotPositions.map((position) => (
        <span
          key={position}
          aria-hidden="true"
          className={`size-2 rounded-full ${position < attempts ? "bg-terracotta-deep" : "bg-line"}`}
        />
      ))}
    </span>
  );
};
