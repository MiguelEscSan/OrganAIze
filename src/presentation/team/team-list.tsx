import type { AgentProfile } from "@/adapters/in-memory/sample-agents";

type TeamListProps = {
  agents: readonly AgentProfile[];
};

const accentByAgent: Record<AgentProfile["name"], string> = {
  orchestrator: "bg-plum",
  develop: "bg-sky",
  testing: "bg-amber",
};

export const TeamList = ({ agents }: TeamListProps) => (
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
        </li>
      ))}
    </ul>
  </section>
);
