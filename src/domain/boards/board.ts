import { hasParentSegment, isAbsolutePath, sameLocation } from "./project-path";

export type Board = {
  id: string;
  name: string;
  rootPath: string;
};

export type BoardDetails = {
  name: string;
  rootPath: string;
};

export type BoardDetailsOutcome = { ok: true; details: BoardDetails } | { ok: false; reason: string };

export const normalizeBoardDetails = (input: BoardDetails, appRoot: string): BoardDetailsOutcome => {
  const name = input.name.trim();
  const rootPath = input.rootPath.trim();

  if (name.length === 0) {
    return { ok: false, reason: "A board needs a name" };
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
