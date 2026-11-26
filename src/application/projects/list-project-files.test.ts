import { describe, expect, it, vi } from "vitest";
import { createInMemoryBoardRepository } from "@/adapters/in-memory/in-memory-board-repository";
import type { ProjectFile, ProjectFiles } from "@/ports/project-files";
import { listProjectFiles } from "./list-project-files";

const board = { id: "board-1", name: "Shop", rootPath: "C:/Projects/shop" };
const files: ProjectFile[] = [{ path: "src/app.tsx", content: "export {};" }];

const listerReturning = (result: ProjectFile[]): ProjectFiles & { list: ReturnType<typeof vi.fn> } => ({
  list: vi.fn(async () => result),
});

describe("listProjectFiles", () => {
  it("returns the files under the root path of the board", async () => {
    const lister = listerReturning(files);
    const query = listProjectFiles({ boards: createInMemoryBoardRepository([board]), projectFiles: lister });

    expect(await query({ kind: "ListProjectFiles", boardId: "board-1" })).toEqual(files);
    expect(lister.list).toHaveBeenCalledWith("C:/Projects/shop");
  });

  it("lists the storage location of a board without a folder", async () => {
    const lister = listerReturning(files);
    const cloudBoard = { id: "board-2", name: "Cloud", rootPath: null };
    const query = listProjectFiles({ boards: createInMemoryBoardRepository([cloudBoard]), projectFiles: lister });

    expect(await query({ kind: "ListProjectFiles", boardId: "board-2" })).toEqual(files);
    expect(lister.list).toHaveBeenCalledWith("storage:board-2");
  });

  it("returns null for a board that does not exist", async () => {
    const lister = listerReturning(files);
    const query = listProjectFiles({ boards: createInMemoryBoardRepository([board]), projectFiles: lister });

    expect(await query({ kind: "ListProjectFiles", boardId: "missing" })).toBeNull();
    expect(lister.list).not.toHaveBeenCalled();
  });
});
