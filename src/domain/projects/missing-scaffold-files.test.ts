import { describe, expect, it } from "vitest";
import { missingScaffoldFiles } from "./missing-scaffold-files";
import { scaffoldFiles } from "./scaffold-template";

const pathsOf = (files: readonly { path: string }[]): string[] => files.map((file) => file.path);

describe("scaffoldFiles", () => {
  it("covers the files of a React, TypeScript and Vite project", () => {
    expect(pathsOf(scaffoldFiles).sort()).toEqual(
      ["App.tsx", "index.html", "main.tsx", "package.json", "tsconfig.json", "vite.config.ts"].sort(),
    );
  });

  it("mounts the root App component from the main entry", () => {
    const entry = scaffoldFiles.find((file) => file.path === "main.tsx");

    expect(entry?.content).toContain('from "./App"');
  });

  it("declares the scripts and dependencies needed to install and build", () => {
    const manifest = JSON.parse(scaffoldFiles.find((file) => file.path === "package.json")?.content ?? "{}");

    expect(Object.keys(manifest.scripts)).toEqual(expect.arrayContaining(["dev", "build", "preview"]));
    expect(Object.keys(manifest.dependencies)).toEqual(expect.arrayContaining(["react", "react-dom"]));
    expect(Object.keys(manifest.devDependencies)).toEqual(
      expect.arrayContaining(["vite", "@vitejs/plugin-react", "typescript", "@types/react", "@types/react-dom"]),
    );
  });
});

describe("missingScaffoldFiles", () => {
  it("returns every scaffold file for an empty project", () => {
    expect(pathsOf(missingScaffoldFiles([]))).toEqual(pathsOf(scaffoldFiles));
  });

  it("returns nothing when the project already has a package.json", () => {
    expect(missingScaffoldFiles(["package.json", "src/index.js"])).toEqual([]);
  });

  it("does not return files that already exist", () => {
    const missing = missingScaffoldFiles(["App.tsx", "notes.md"]);

    expect(pathsOf(missing)).not.toContain("App.tsx");
    expect(pathsOf(missing)).toContain("package.json");
  });
});
