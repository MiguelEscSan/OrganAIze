import { describe, expect, it } from "vitest";
import { createInMemoryObjectStore } from "./in-memory-object-store";
import { createSupabaseProjectFiles } from "./supabase-project-files";

describe("supabase project files", () => {
  it("lists files with paths relative to the board", async () => {
    const store = createInMemoryObjectStore({
      "board-1/src/app.ts": "a",
      "board-1/readme.md": "b",
      "board-2/other.ts": "c",
    });

    const files = await createSupabaseProjectFiles(store).list("storage:board-1");

    expect(files).toEqual(
      expect.arrayContaining([
        { path: "src/app.ts", content: "a" },
        { path: "readme.md", content: "b" },
      ]),
    );
    expect(files).toHaveLength(2);
  });

  it("does not match a board whose id starts with the same characters", async () => {
    const store = createInMemoryObjectStore({ "board-10/a.ts": "x" });

    expect(await createSupabaseProjectFiles(store).list("storage:board-1")).toEqual([]);
  });

  it("skips ignored folders, oversized files and binary files", async () => {
    const store = createInMemoryObjectStore({
      "b/node_modules/x/index.js": "x",
      "b/.git/config": "x",
      "b/.next/cache.js": "x",
      "b/dist/out.js": "x",
      "b/build/out.js": "x",
      "b/src/node_modules/y.js": "x",
      "b/big.txt": "a".repeat(200_001),
      "b/limit.txt": "a".repeat(200_000),
      "b/bin.dat": "ab\u0000cd",
      "b/keep.ts": "ok",
    });

    const files = await createSupabaseProjectFiles(store).list("storage:b");

    expect(files.map((file) => file.path).sort()).toEqual(["keep.ts", "limit.txt"]);
  });

  it("returns an empty list for an empty prefix", async () => {
    expect(await createSupabaseProjectFiles(createInMemoryObjectStore()).list("storage:b")).toEqual([]);
  });
});
