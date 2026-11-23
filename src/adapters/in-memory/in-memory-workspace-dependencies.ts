import type { Request } from "@/domain/requests/request";
import { createInMemoryBoardRepository } from "./in-memory-board-repository";

export const inMemoryBoardId = "board-1";

export const developSeed = {
  requests: [{ id: "request-1", boardId: inMemoryBoardId, title: "Landing", description: "" }] satisfies Request[],
};

export const inMemoryWorkspaceDependencies = <Workspace>(workspace: Workspace) => ({
  boards: createInMemoryBoardRepository([{ id: inMemoryBoardId, name: "Sample", rootPath: "C:/projects/sample" }]),
  workspaceFor: () => workspace,
});
