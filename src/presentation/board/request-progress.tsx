import { agentNames, type AgentName } from "@/domain/agents/agent-name";
import { describeRequestProgress } from "@/domain/tasks/describe-request-progress";
import type { FamilySummary } from "@/domain/tasks/group-column-into-families";
import { agentChipClass, agentLabel } from "./agent-activity";

type RequestProgressProps = {
  summary: FamilySummary;
};

const repeat = (segmentClass: string, count: number): string[] =>
  Array.from({ length: Math.max(count, 0) }, () => segmentClass);

const segmentClasses = (summary: FamilySummary): string[] => {
  const { byStatus, total } = summary;
  const ordered = [
    ...repeat("bg-sage-deep", byStatus.deploy),
    ...repeat("bg-amber", byStatus.awaiting_release),
    ...repeat("bg-terracotta-deep", byStatus.review),
    ...repeat("bg-amber-deep", byStatus.qa),
    ...repeat("bg-sky-deep", byStatus.in_progress),
  ];

  return [...ordered, ...repeat("bg-line", total - ordered.length)];
};

const workingAgents = (summary: FamilySummary): AgentName[] =>
  agentNames.filter((agent) => (summary.workingByAgent[agent] ?? 0) > 0);

export const RequestProgress = ({ summary }: RequestProgressProps) => {
  const agents = workingAgents(summary);

  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="progressbar"
        aria-label="Subtasks deployed"
        aria-valuemin={0}
        aria-valuemax={summary.total}
        aria-valuenow={summary.deployed}
        className="flex h-2 gap-[3px]"
      >
        {segmentClasses(summary).map((segmentClass, index) => (
          <span key={index} className={`flex-1 rounded-full ${segmentClass}`} />
        ))}
      </div>
      <p className="text-xs font-bold text-muted">
        {describeRequestProgress({
          deployed: summary.deployed,
          awaitingRelease: summary.byStatus.awaiting_release,
          total: summary.total,
        })}
      </p>
      {agents.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {agents.map((agent) => (
            <li key={agent} className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${agentChipClass(agent)}`}>
              {agentLabel(agent)} on {summary.workingByAgent[agent]}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
