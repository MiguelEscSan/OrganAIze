import { describe, expect, it } from "vitest";
import type { ProjectFile } from "@/ports/project-files";
import { previewSourceFilesOf } from "./preview-source-files";

const file = (path: string): ProjectFile => ({ path, content: "x" });

const pathsOf = (files: readonly ProjectFile[]): string[] => files.map((item) => item.path);

describe("previewSourceFilesOf", () => {
  it("removes the scaffold-only files at the project root", () => {
    const files = ["package.json", "tsconfig.json", "vite.config.ts", "index.html", "main.tsx", "App.tsx"].map(file);

    expect(pathsOf(previewSourceFilesOf(files))).toEqual(["App.tsx"]);
  });

  it("keeps source files, including nested files that share a scaffold file name", () => {
    const files = ["App.tsx", "src/Cart.tsx", "src/index.html", "components/package.json", "styles.css"].map(file);

    expect(pathsOf(previewSourceFilesOf(files))).toEqual(files.map((item) => item.path));
  });

  it("returns nothing when the project holds only scaffold files", () => {
    expect(previewSourceFilesOf(["package.json", "index.html"].map(file))).toEqual([]);
  });
});
