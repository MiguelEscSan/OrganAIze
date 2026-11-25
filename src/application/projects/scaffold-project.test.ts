import { describe, expect, it } from "vitest";
import { createInMemoryProjectFiles } from "@/adapters/in-memory/in-memory-project-files";
import { createInMemoryWorkspaceWriter } from "@/adapters/in-memory/in-memory-workspace-writer";
import { scaffoldFiles } from "@/domain/projects/scaffold-template";
import type { WorkspaceWriter } from "@/ports/workspace-writer";
import { scaffoldProject } from "./scaffold-project";

const command = { kind: "ScaffoldProject" as const, rootPath: "C:/projects/shop" };

const setup = (initial: Record<string, string> = {}) => {
  const workspace = createInMemoryWorkspaceWriter(initial);

  return { workspace, scaffold: scaffoldProject({ projectFiles: createInMemoryProjectFiles(workspace), workspaceFor: () => workspace }) };
};

describe("scaffoldProject", () => {
  it("writes every scaffold file into an empty project", async () => {
    const { workspace, scaffold } = setup();

    const outcome = await scaffold(command);

    expect(outcome.ok).toBe(true);
    expect(Object.keys(workspace.files()).sort()).toEqual(scaffoldFiles.map((file) => file.path).sort());
  });

  it("leaves a project that already has a package.json untouched", async () => {
    const { workspace, scaffold } = setup({ "package.json": "{}", "src/main.js": "x" });

    const outcome = await scaffold(command);

    expect(outcome).toEqual({ ok: true, value: [] });
    expect(workspace.files()).toEqual({ "package.json": "{}", "src/main.js": "x" });
  });

  it("never overwrites a file when it runs twice", async () => {
    const { workspace, scaffold } = setup();
    await scaffold(command);
    await workspace.write([{ path: "App.tsx", content: "edited by develop" }]);

    const second = await scaffold(command);

    expect(second).toEqual({ ok: true, value: [] });
    expect(workspace.files()["App.tsx"]).toBe("edited by develop");
  });

  it("does not overwrite an existing App.tsx in a project without a package.json", async () => {
    const { workspace, scaffold } = setup({ "App.tsx": "mine" });

    await scaffold(command);

    expect(workspace.files()["App.tsx"]).toBe("mine");
    expect(workspace.files()["package.json"]).toBeDefined();
  });

  it("fails with the reason instead of throwing when the files cannot be written", async () => {
    const workspace = createInMemoryWorkspaceWriter();
    const brokenWriter: WorkspaceWriter = {
      read: workspace.read,
      write: async () => {
        throw new Error("disk is read-only");
      },
    };
    const scaffold = scaffoldProject({ projectFiles: createInMemoryProjectFiles(workspace), workspaceFor: () => brokenWriter });

    const outcome = await scaffold(command);

    expect(outcome).toEqual({ ok: false, reason: "The project scaffold could not be written: disk is read-only" });
  });

  it("fails with the reason instead of throwing when the project files cannot be listed", async () => {
    const workspace = createInMemoryWorkspaceWriter();
    const scaffold = scaffoldProject({
      projectFiles: {
        list: async () => {
          throw new Error("folder is unreadable");
        },
      },
      workspaceFor: () => workspace,
    });

    const outcome = await scaffold(command);

    expect(outcome).toEqual({ ok: false, reason: "The project scaffold could not be written: folder is unreadable" });
    expect(workspace.files()).toEqual({});
  });
});
