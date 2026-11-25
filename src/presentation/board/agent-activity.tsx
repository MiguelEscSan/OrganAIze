import type { AgentName } from "@/domain/agents/agent-name";

type AgentActivityProps = {
  agent: AgentName | null;
  liveStatus: string;
};

export const agentLabel = (agent: AgentName): string => `${agent.charAt(0).toUpperCase()}${agent.slice(1)}`;

export const agentChipClass = (agent: AgentName | null): string => {
  if (agent === "develop") {
    return "bg-sky-soft text-sky-ink";
  }

  if (agent === "testing") {
    return "bg-amber-soft text-amber-ink";
  }

  return "bg-cream text-ink";
};

const headline = (agent: AgentName | null): string => {
  if (agent === "testing") {
    return "Testing is reviewing";
  }

  return `${agent ? agentLabel(agent) : "Agent"} is working`;
};

export const AgentActivity = ({ agent, liveStatus }: AgentActivityProps) => {
  const isTesting = agent === "testing";

  return (
    <div
      className={`flex flex-col gap-1 rounded-lg px-3 py-2.5 ${
        isTesting ? "bg-amber-soft text-amber-ink" : "bg-sky-soft text-sky-ink"
      }`}
    >
      <p className="flex items-center gap-2 text-xs font-extrabold">
        <span
          aria-hidden="true"
          className={`inline-block size-2 animate-pulse rounded-full motion-reduce:animate-none ${
            isTesting ? "bg-amber-deep" : "bg-sky-deep"
          }`}
        />
        {headline(agent)}
      </p>
      <p className="text-sm font-bold text-ink">{liveStatus}</p>
    </div>
  );
};
