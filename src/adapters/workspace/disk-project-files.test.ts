import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDiskProjectFiles } from "./disk-project-files";

const project = async (entries: Record<string, string>): Promise<string> => {
  const root = await mkdtemp(path.join(tmpdir(), "project-files-"));

  for (const [relative, content] of Object.entries(entries)) {
    const target = path.join(root, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }

  return root;
};

describe("createDiskProjectFiles", () => {
  it("lists text files in nested folders with forward-slash paths", async () => {
    const root = await project({ "src/app.tsx": "export {};", "package.json": "{}" });

    const listed = await createDiskProjectFiles().list(root);

    expect(listed).toEqual(
      expect.arrayContaining([
        { path: "src/app.tsx", content: "export {};" },
        { path: "package.json", content: "{}" },
      ]),
    );
    expect(listed).toHaveLength(2);
  });

  it("skips dependency, build and git folders", async () => {
    const root = await project({
      "src/app.tsx": "x",
      "node_modules/pkg/index.js": "y",
      ".git/HEAD": "z",
      ".next/cache.json": "w",
    });

    const listed = await createDiskProjectFiles().list(root);

    expect(listed.map((file) => file.path)).toEqual(["src/app.tsx"]);
  });

  it("lists nothing for a folder that does not exist yet", async () => {
    const root = await project({});

    const listed = await createDiskProjectFiles().list(path.join(root, "not-created-yet"));

    expect(listed).toEqual([]);
  });
});
