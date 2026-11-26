import { describe, expect, it, vi } from "vitest";
import type { ProjectFiles } from "@/ports/project-files";
import type { WorkspaceWriter } from "@/ports/workspace-writer";
import { lazily, routedProjectFiles, routedWorkspaceFor } from "./routed-workspace";

const writerNamed = (name: string): WorkspaceWriter => ({ name }) as unknown as WorkspaceWriter;

const filesReturning = (content: string): ProjectFiles => ({
  list: async () => [{ path: "a.ts", content }],
});

describe("routedWorkspaceFor", () => {
  it("sends a storage location to the storage workspace", () => {
    const disk = vi.fn((location: string) => writerNamed(`disk:${location}`));
    const storage = vi.fn((location: string) => writerNamed(`storage:${location}`));

    const workspace = routedWorkspaceFor(disk, storage)("storage:board-1");

    expect(workspace).toEqual(writerNamed("storage:storage:board-1"));
    expect(disk).not.toHaveBeenCalled();
  });

  it("sends a disk path to the disk workspace", () => {
    const disk = vi.fn((location: string) => writerNamed(`disk:${location}`));
    const storage = vi.fn((location: string) => writerNamed(`storage:${location}`));

    const workspace = routedWorkspaceFor(disk, storage)("C:/projects/site");

    expect(workspace).toEqual(writerNamed("disk:C:/projects/site"));
    expect(storage).not.toHaveBeenCalled();
  });

  it("can be called repeatedly for the same location", () => {
    const storage = vi.fn((location: string) => writerNamed(location));
    const route = routedWorkspaceFor(() => writerNamed("disk"), storage);

    route("storage:board-1");
    route("storage:board-1");

    expect(storage).toHaveBeenCalledTimes(2);
  });
});

describe("routedProjectFiles", () => {
  it("lists a storage location from the storage files", async () => {
    const files = routedProjectFiles(filesReturning("disk"), filesReturning("storage"));

    expect(await files.list("storage:board-1")).toEqual([{ path: "a.ts", content: "storage" }]);
  });

  it("lists a disk path from the disk files", async () => {
    const files = routedProjectFiles(filesReturning("disk"), filesReturning("storage"));

    expect(await files.list("C:/projects/site")).toEqual([{ path: "a.ts", content: "disk" }]);
  });
});

describe("lazily", () => {
  it("does not create the value until it is first requested", () => {
    const create = vi.fn(() => ({ id: 1 }));

    lazily(create);

    expect(create).not.toHaveBeenCalled();
  });

  it("creates the value once and reuses it", () => {
    const create = vi.fn(() => ({ id: 1 }));
    const get = lazily(create);

    expect(get()).toBe(get());
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("surfaces the creation failure when requested", () => {
    const get = lazily((): string => {
      throw new Error("SUPABASE_URL is not set");
    });

    expect(get).toThrow("SUPABASE_URL is not set");
  });
});
