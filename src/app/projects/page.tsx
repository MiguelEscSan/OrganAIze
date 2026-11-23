import { ProjectsList } from "@/presentation/projects/projects-list";
import { sampleProjects } from "@/adapters/in-memory/sample-projects";

export default function ProjectsPage() {
  return <ProjectsList projects={sampleProjects} />;
}
