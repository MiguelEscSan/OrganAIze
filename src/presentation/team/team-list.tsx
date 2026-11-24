import type { AgentProfile } from "@/adapters/in-memory/sample-agents";
import type { AgentActivityRecord } from "@/domain/agents/agent-activity";
import type { AgentName } from "@/domain/agents/agent-name";

type TeamListProps = {
  agents: readonly AgentProfile[];
  activities: Partial<Record<AgentName, AgentActivityRecord>>;
};

const accentByAgent: Record<AgentProfile["name"], string> = {
  orchestrator: "bg-plum",
  develop: "bg-sky",
  testing: "bg-amber",
};

export const TeamList = ({ agents, activities }: TeamListProps) => (
  <section className="flex flex-col gap-6 p-6 md:p-10">
    <header className="flex flex-col gap-1">
      <h1 className="text-3xl font-extrabold tracking-tight">Team</h1>
      <p className="text-muted">The three agents working on your board, and what each one is responsible for.</p>
    </header>
    <ul className="grid gap-4 md:grid-cols-3">
      {agents.map((agent) => (
        <li key={agent.name} className="flex flex-col gap-3 rounded-2xl bg-paper p-5 ring-1 ring-line">
          <span className={`h-1.5 w-12 rounded-full ${accentByAgent[agent.name]}`} aria-hidden="true" />
          <h2 className="text-lg font-bold">{agent.displayName}</h2>
          <p className="text-sm font-semibold text-terracotta">{agent.role}</p>
          <p className="text-sm text-muted">{agent.responsibility}</p>
          {activities[agent.name] ? (
            <p className="mt-auto rounded-lg bg-cream px-3 py-2 text-sm">
              <span className="font-semibold capitalize">{activities[agent.name]?.state}</span>
              <span className="text-muted"> · {activities[agent.name]?.message}</span>
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  </section>
);
