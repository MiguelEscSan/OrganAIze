import { describe, expect, it } from "vitest";
import { buildFileTree } from "./build-file-tree";

describe("buildFileTree", () => {
  it("returns an empty tree when there are no paths", () => {
    expect(buildFileTree([])).toEqual([]);
  });

  it("keeps root-level files as file nodes", () => {
    expect(buildFileTree(["package.json"])).toEqual([{ kind: "file", name: "package.json", path: "package.json" }]);
  });

  it("nests a file under its folder", () => {
    expect(buildFileTree(["components/App.tsx"])).toEqual([
      {
        kind: "folder",
        name: "components",
        path: "components",
        children: [{ kind: "file", name: "App.tsx", path: "components/App.tsx" }],
      },
    ]);
  });

  it("creates every ancestor folder of a deep path once", () => {
    const tree = buildFileTree(["src/ui/forms/Input.tsx", "src/ui/forms/Select.tsx"]);

    expect(tree).toEqual([
      {
        kind: "folder",
        name: "src",
        path: "src",
        children: [
          {
            kind: "folder",
            name: "ui",
            path: "src/ui",
            children: [
              {
                kind: "folder",
                name: "forms",
                path: "src/ui/forms",
                children: [
                  { kind: "file", name: "Input.tsx", path: "src/ui/forms/Input.tsx" },
                  { kind: "file", name: "Select.tsx", path: "src/ui/forms/Select.tsx" },
                ],
              },
            ],
          },
        ],
      },
    ]);
  });

  it("lists folders before files at every level", () => {
    const tree = buildFileTree(["a.txt", "zeta/inner.txt", "alpha/inner.txt", "b.txt"]);

    expect(tree.map((node) => node.name)).toEqual(["alpha", "zeta", "a.txt", "b.txt"]);
  });

  it("orders names alphabetically ignoring case", () => {
    const tree = buildFileTree(["banana.ts", "Cherry.ts", "apple.ts"]);

    expect(tree.map((node) => node.name)).toEqual(["apple.ts", "banana.ts", "Cherry.ts"]);
  });

  it("does not duplicate a repeated path", () => {
    expect(buildFileTree(["a/b.ts", "a/b.ts"])).toEqual([
      {
        kind: "folder",
        name: "a",
        path: "a",
        children: [{ kind: "file", name: "b.ts", path: "a/b.ts" }],
      },
    ]);
  });

  it("ignores empty path segments", () => {
    expect(buildFileTree(["a//b.ts"])).toEqual(buildFileTree(["a/b.ts"]));
  });
});
