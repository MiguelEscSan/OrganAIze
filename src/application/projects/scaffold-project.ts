import { missingScaffoldFiles } from "@/domain/projects/missing-scaffold-files";
import type { ProjectFiles } from "@/ports/project-files";
import type { WorkspaceWriter } from "@/ports/workspace-writer";
import { fail, succeed, type Outcome } from "../shared/outcome";

export type ScaffoldProject = {
  kind: "ScaffoldProject";
  rootPath: string;
};

export type ScaffoldDependencies = {
  projectFiles: ProjectFiles;
  workspaceFor: (rootPath: string) => WorkspaceWriter;
};

const scaffoldFailureReason = (error: unknown): string =>
  `The project scaffold could not be written: ${error instanceof Error ? error.message : "unknown error"}`;

export const scaffoldProject =
  (deps: ScaffoldDependencies) =>
  async (command: ScaffoldProject): Promise<Outcome<string[]>> => {
    try {
      const existing = await deps.projectFiles.list(command.rootPath);
      const missing = missingScaffoldFiles(existing.map((file) => file.path));

      if (missing.length > 0) {
        await deps.workspaceFor(command.rootPath).write(missing);
      }

      return succeed(missing.map((file) => file.path));
    } catch (error) {
      return fail(scaffoldFailureReason(error));
    }
  };
