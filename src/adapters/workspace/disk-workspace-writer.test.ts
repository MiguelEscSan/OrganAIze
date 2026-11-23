import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDiskWorkspaceWriter } from "./disk-workspace-writer";

describe("disk workspace writer", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "agent-team-workspace-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("writes files, creating missing folders inside the root", async () => {
    const writer = createDiskWorkspaceWriter(root);

    await writer.write([{ path: "src/app/page.tsx", content: "export default 1;" }]);

    expect(await readFile(join(root, "src/app/page.tsx"), "utf8")).toBe("export default 1;");
  });

  it("reads a file back and returns null for a missing one", async () => {
    const writer = createDiskWorkspaceWriter(root);

    await writer.write([{ path: "notes.txt", content: "hello" }]);

    expect(await writer.read("notes.txt")).toBe("hello");
    expect(await writer.read("missing.txt")).toBeNull();
  });

  it("refuses a path that resolves outside the root and writes nothing", async () => {
    const writer = createDiskWorkspaceWriter(root);

    await expect(
      writer.write([
        { path: "ok.txt", content: "fine" },
        { path: "../escaped.txt", content: "nope" },
      ]),
    ).rejects.toThrow("outside the workspace root");

    expect(await writer.read("ok.txt")).toBeNull();
  });
});
