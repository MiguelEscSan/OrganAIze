import { describe, expect, it } from "vitest";
import { createInMemoryObjectStore } from "./in-memory-object-store";
import { createSupabaseWorkspaceWriter } from "./supabase-workspace-writer";

describe("supabase workspace writer", () => {
  it("returns null when the object does not exist", async () => {
    const writer = createSupabaseWorkspaceWriter(createInMemoryObjectStore(), "storage:board-1");

    expect(await writer.read("src/app.ts")).toBeNull();
  });

  it("reads back what it wrote under the board prefix", async () => {
    const store = createInMemoryObjectStore();
    const writer = createSupabaseWorkspaceWriter(store, "storage:board-1");

    await writer.write([{ path: "src/app.ts", content: "export {};" }]);

    expect(await writer.read("src/app.ts")).toBe("export {};");
    expect(store.keys()).toEqual(["board-1/src/app.ts"]);
  });

  it("overwrites an existing file", async () => {
    const writer = createSupabaseWorkspaceWriter(createInMemoryObjectStore(), "storage:board-1");

    await writer.write([{ path: "a.ts", content: "one" }]);
    await writer.write([{ path: "a.ts", content: "two" }]);

    expect(await writer.read("a.ts")).toBe("two");
  });

  it("rejects paths that escape the project", async () => {
    const store = createInMemoryObjectStore();
    const writer = createSupabaseWorkspaceWriter(store, "storage:board-1");

    await expect(writer.write([{ path: "../other/a.ts", content: "x" }])).rejects.toThrow("outside the workspace");
    await expect(writer.write([{ path: "/etc/a.ts", content: "x" }])).rejects.toThrow("outside the workspace");
    await expect(writer.read(["..", "a.ts"].join(String.fromCharCode(92)))).rejects.toThrow("outside the workspace");
    expect(store.keys()).toEqual([]);
  });

  it("rejects the whole batch when one path escapes", async () => {
    const store = createInMemoryObjectStore();
    const writer = createSupabaseWorkspaceWriter(store, "storage:board-1");

    await expect(
      writer.write([
        { path: "ok.ts", content: "x" },
        { path: "../bad.ts", content: "y" },
      ]),
    ).rejects.toThrow();
    expect(store.keys()).toEqual([]);
  });
});
