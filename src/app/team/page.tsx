import { TeamList } from "@/presentation/team/team-list";
import { sampleAgents } from "@/adapters/in-memory/sample-agents";

export default function TeamPage() {
  return <TeamList agents={sampleAgents} />;
}
