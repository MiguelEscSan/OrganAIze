import type { Project } from "@/domain/projects/project";

type ProjectsListProps = {
  projects: readonly Project[];
};

const percentComplete = (project: Project) =>
  project.totalTaskCount === 0
    ? 0
    : Math.round((project.completedTaskCount / project.totalTaskCount) * 100);

export const ProjectsList = ({ projects }: ProjectsListProps) => (
  <section className="flex flex-col gap-6 p-6 md:p-10">
    <header className="flex flex-col gap-1">
      <h1 className="text-3xl font-extrabold tracking-tight">Projects</h1>
      <p className="text-muted">Every app your team is building, and how far along each one is.</p>
    </header>
    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <li
          key={project.id}
          className="flex flex-col gap-4 rounded-2xl bg-paper p-5 shadow-[0_2px_0_var(--color-line)] ring-1 ring-line"
        >
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold">{project.name}</h2>
            <p className="text-sm text-muted">{project.description}</p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm font-semibold">
              <span>{project.completedTaskCount} of {project.totalTaskCount} tasks deployed</span>
              <span>{percentComplete(project)}%</span>
            </div>
            <div
              role="progressbar"
              aria-label={`${project.name} progress`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percentComplete(project)}
              className="h-2.5 overflow-hidden rounded-full bg-cream"
            >
              <div
                className="h-full rounded-full bg-sage"
                style={{ width: `${percentComplete(project)}%` }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-muted">
            <span>{project.requestCount} {project.requestCount === 1 ? "request" : "requests"}</span>
            <span className="truncate pl-3">{project.targetUrl}</span>
          </div>
        </li>
      ))}
    </ul>
  </section>
);
