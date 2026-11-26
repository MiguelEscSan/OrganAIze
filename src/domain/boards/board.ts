import { hasParentSegment, isAbsolutePath, sameLocation } from "./project-path";

export type Board = {
  id: string;
  name: string;
  rootPath: string | null;
};

export type BoardDetailsInput = {
  name: string;
  rootPath?: string | null;
};

export type BoardDetails = {
  name: string;
  rootPath: string | null;
};

const storageLocationPrefix = "storage:";

export const workspaceLocationOf = (board: Board): string => board.rootPath ?? `${storageLocationPrefix}${board.id}`;

export const isStorageLocation = (location: string): boolean => location.startsWith(storageLocationPrefix);

export type BoardDetailsOutcome = { ok: true; details: BoardDetails } | { ok: false; reason: string };

export const normalizeBoardDetails = (input: BoardDetailsInput, appRoot: string): BoardDetailsOutcome => {
  const name = input.name.trim();
  const rootPath = (input.rootPath ?? "").trim();

  if (name.length === 0) {
    return { ok: false, reason: "A board needs a name" };
  }

  if (rootPath.length === 0) {
    return { ok: true, details: { name, rootPath: null } };
  }

  if (!isAbsolutePath(rootPath)) {
    return { ok: false, reason: "The project root must be an absolute path" };
  }

  if (hasParentSegment(rootPath)) {
    return { ok: false, reason: "The project root cannot contain '..'" };
  }

  if (sameLocation(rootPath, appRoot)) {
    return { ok: false, reason: "The project root cannot be the agent-team repository" };
  }

  return { ok: true, details: { name, rootPath } };
};
