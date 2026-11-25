import { describe, expect, it } from "vitest";
import { createInMemoryDependencies } from "@/adapters/in-memory/in-memory-dependencies";
import { createInMemoryProjectFiles } from "@/adapters/in-memory/in-memory-project-files";
import { createInMemoryWorkspaceWriter } from "@/adapters/in-memory/in-memory-workspace-writer";
import type { Board } from "@/domain/boards/board";
import type { WorkspaceWriter } from "@/ports/workspace-writer";
import { createBoard } from "./create-board";

const withWorkspace = (seed: { boards?: readonly Board[] } = {}, initial: Record<string, string> = {}) => {
  const workspace = createInMemoryWorkspaceWriter(initial);
  const deps = {
    ...createInMemoryDependencies(seed),
    projectFiles: createInMemoryProjectFiles(workspace),
    workspaceFor: () => workspace,
  };

  return { workspace, deps };
};

describe("createBoard", () => {
  it("stores a board with a generated id and normalized name and folder", async () => {
    const { deps } = withWorkspace();

    const outcome = await createBoard(deps)({ kind: "CreateBoard", name: "  Landing ", rootPath: " C:/projects/landing " });

    expect(outcome).toEqual({ ok: true, value: { id: "id-1", name: "Landing", rootPath: "C:/projects/landing" } });
    expect(await deps.boards.list()).toEqual([{ id: "id-1", name: "Landing", rootPath: "C:/projects/landing" }]);
  });

  it("refuses a relative project folder and stores nothing", async () => {
    const { deps } = withWorkspace();

    const outcome = await createBoard(deps)({ kind: "CreateBoard", name: "Landing", rootPath: "projects/landing" });

    expect(outcome).toEqual({ ok: false, reason: "The project root must be an absolute path" });
    expect(await deps.boards.list()).toEqual([]);
  });

  it("refuses a folder that another board already uses", async () => {
    const { deps } = withWorkspace({
      boards: [{ id: "board-1", name: "Landing", rootPath: "C:/projects/landing" }],
    });

    const outcome = await createBoard(deps)({ kind: "CreateBoard", name: "Copy", rootPath: "C:/projects/landing" });

    expect(outcome).toEqual({ ok: false, reason: "A board already uses this folder" });
    expect(await deps.boards.list()).toEqual([{ id: "board-1", name: "Landing", rootPath: "C:/projects/landing" }]);
  });

  it("writes the project scaffold into the new project folder", async () => {
    const { deps, workspace } = withWorkspace();

    await createBoard(deps)({ kind: "CreateBoard", name: "Landing", rootPath: "C:/projects/landing" });

    expect(Object.keys(workspace.files()).sort()).toEqual(
      ["App.tsx", "index.html", "main.tsx", "package.json", "tsconfig.json", "vite.config.ts"],
    );
  });

  it("leaves an existing project untouched", async () => {
    const { deps, workspace } = withWorkspace({}, { "package.json": "{}" });

    await createBoard(deps)({ kind: "CreateBoard", name: "Landing", rootPath: "C:/projects/landing" });

    expect(workspace.files()).toEqual({ "package.json": "{}" });
  });

  it("does not scaffold a folder that another board already uses", async () => {
    const { deps, workspace } = withWorkspace({
      boards: [{ id: "board-1", name: "Landing", rootPath: "C:/projects/landing" }],
    });

    await createBoard(deps)({ kind: "CreateBoard", name: "Copy", rootPath: "C:/projects/landing" });

    expect(workspace.files()).toEqual({});
  });

  it("still creates the project when the scaffold cannot be written", async () => {
    const base = withWorkspace();
    const brokenWriter: WorkspaceWriter = {
      read: base.workspace.read,
      write: async () => {
        throw new Error("disk is read-only");
      },
    };

    const outcome = await createBoard({ ...base.deps, workspaceFor: () => brokenWriter })({
      kind: "CreateBoard",
      name: "Landing",
      rootPath: "C:/projects/landing",
    });

    expect(outcome).toEqual({ ok: true, value: { id: "id-1", name: "Landing", rootPath: "C:/projects/landing" } });
    expect(await base.deps.boards.list()).toHaveLength(1);
  });
});
