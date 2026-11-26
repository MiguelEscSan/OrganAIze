import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { isStorageLocation } from "@/domain/boards/board";
import type { InterfaceProbe, InterfaceProbeResult } from "@/ports/interface-probe";
import type { ProjectFile, ProjectFiles } from "@/ports/project-files";

const tempDirectoryPrefix = "agent-team-probe-";

const resolveInside = (root: string, relativePath: string): string | null => {
  const target = path.resolve(root, relativePath);
  const relative = path.relative(root, target);
  const escapes = relative.length === 0 || relative.startsWith("..") || path.isAbsolute(relative);

  return escapes ? null : target;
};

const writeProjectFile = async (root: string, file: ProjectFile): Promise<boolean> => {
  const target = resolveInside(root, file.path);

  if (target === null) {
    return false;
  }

  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, file.content, "utf8");

  return true;
};

const materialize = async (root: string, files: ProjectFile[]): Promise<string | null> => {
  for (const file of files) {
    if (!(await writeProjectFile(root, file))) {
      return `Project file path escapes the project folder: ${file.path}`;
    }
  }

  return null;
};

const inspectStorageLocation = async (
  inner: InterfaceProbe,
  projectFiles: ProjectFiles,
  location: string,
): Promise<InterfaceProbeResult> => {
  const files = await projectFiles.list(location);

  if (files.length === 0) {
    return { ok: false, reason: "The project has no files in storage to run in the browser." };
  }

  const root = await mkdtemp(path.join(tmpdir(), tempDirectoryPrefix));

  try {
    const problem = await materialize(root, files);

    return problem === null ? await inner.inspect(root) : { ok: false, reason: problem };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
};

export const createMaterializingInterfaceProbe = (
  inner: InterfaceProbe,
  projectFiles: ProjectFiles,
): InterfaceProbe => ({
  inspect: (rootPath) =>
    isStorageLocation(rootPath) ? inspectStorageLocation(inner, projectFiles, rootPath) : inner.inspect(rootPath),
});
