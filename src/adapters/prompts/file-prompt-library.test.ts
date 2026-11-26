import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFilePromptLibrary } from "./file-prompt-library";

describe("file prompt library", () => {
  let directory = "";

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "prompts-"));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it("renders the markdown file named after the prompt", async () => {
    await writeFile(join(directory, "merge.md"), "Merge {{path}}\n");

    expect(createFilePromptLibrary(directory).render("merge", { path: "a.ts" })).toBe("Merge a.ts");
  });

  it("removes only the final newline of the file", async () => {
    await writeFile(join(directory, "merge.md"), "Merge\n\n{{path}}\n\n");

    expect(createFilePromptLibrary(directory).render("merge", { path: "a.ts" })).toBe("Merge\n\na.ts\n");
  });

  it("reads windows line endings as plain line feeds", async () => {
    await writeFile(join(directory, "merge.md"), "Merge\r\n\r\n{{path}}\r\n");

    expect(createFilePromptLibrary(directory).render("merge", { path: "a.ts" })).toBe("Merge\n\na.ts");
  });

  it("reads each file once", async () => {
    await writeFile(join(directory, "merge.md"), "first {{path}}");
    const library = createFilePromptLibrary(directory);
    library.render("merge", { path: "a" });

    await writeFile(join(directory, "merge.md"), "second {{path}}");

    expect(library.render("merge", { path: "b" })).toBe("first b");
  });

  it("fails when the file is missing, naming the prompt and the path", () => {
    expect(() => createFilePromptLibrary(directory).render("develop", {})).toThrow(
      `The prompt "develop" was not found at ${join(directory, "develop.md")}`,
    );
  });

  it("fails when a variable is missing", async () => {
    await writeFile(join(directory, "merge.md"), "Merge {{path}}");

    expect(() => createFilePromptLibrary(directory).render("merge", {})).toThrow('The prompt "merge" needs the variable "path"');
  });
});
