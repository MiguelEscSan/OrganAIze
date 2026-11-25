import { describe, expect, it } from "vitest";
import { defaultContextBudget, selectContextFiles } from "./select-context-files";

const file = (path: string, content = "x"): { path: string; content: string } => ({ path, content });

const pathsOf = (files: readonly { path: string }[]): string[] => files.map((entry) => entry.path);

describe("selectContextFiles", () => {
  it("excludes the files of the subtask itself", () => {
    const selected = selectContextFiles([file("a.ts"), file("b.ts")], ["a.ts"], 100);

    expect(pathsOf(selected)).toEqual(["b.ts"]);
  });

  it("excludes the scaffold-only root files but keeps App.tsx", () => {
    const files = ["package.json", "tsconfig.json", "vite.config.ts", "index.html", "main.tsx", "App.tsx"].map((path) =>
      file(path),
    );

    expect(pathsOf(selectContextFiles(files, [], 1000))).toEqual(["App.tsx"]);
  });

  it("keeps a nested file that shares its name with a scaffold-only file", () => {
    expect(pathsOf(selectContextFiles([file("src/main.tsx")], [], 1000))).toEqual(["src/main.tsx"]);
  });

  it("orders the files alphabetically by path", () => {
    const selected = selectContextFiles([file("c.ts"), file("a.ts"), file("b.ts")], [], 100);

    expect(pathsOf(selected)).toEqual(["a.ts", "b.ts", "c.ts"]);
  });

  it("skips a file that does not fit whole and still adds later smaller files", () => {
    const files = [file("a.ts", "12345"), file("b.ts", "1234567890"), file("c.ts", "123")];

    const selected = selectContextFiles(files, [], 9);

    expect(selected).toEqual([file("a.ts", "12345"), file("c.ts", "123")]);
  });

  it("never exceeds the budget in total content characters", () => {
    const files = [file("a.ts", "aaaa"), file("b.ts", "bbbb"), file("c.ts", "cccc")];

    const total = selectContextFiles(files, [], 8).reduce((sum, entry) => sum + entry.content.length, 0);

    expect(total).toBeLessThanOrEqual(8);
  });

  it("offers a default budget of 30000 characters", () => {
    expect(defaultContextBudget).toBe(30000);
  });
});
