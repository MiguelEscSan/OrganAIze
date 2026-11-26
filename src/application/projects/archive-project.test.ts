import { unzipSync, strFromU8 } from "fflate";
import { describe, expect, it } from "vitest";
import { createFflateArchiveWriter } from "@/adapters/archive/fflate-archive-writer";
import { createInMemoryArchiveWriter } from "@/adapters/in-memory/in-memory-archive-writer";
import { createInMemoryBoardRepository } from "@/adapters/in-memory/in-memory-board-repository";
import type { ProjectFile, ProjectFiles } from "@/ports/project-files";
import { archiveFilenameOf, archiveProject } from "./archive-project";

const files: ProjectFile[] = [
  { path: "package.json", content: '{ "name": "shop" }\n' },
  { path: "src/components/Cart.tsx", content: "export const Cart = () => null;\n" },
  { path: "App.tsx", content: "export default function App() {\n  return null;\n}\n" },
];

const projectFilesReturning = (result: ProjectFile[]): ProjectFiles => ({ list: async () => result });

const boardsNamed = (name: string) => createInMemoryBoardRepository([{ id: "board-1", name, rootPath: "C:/Projects/shop" }]);

describe("archiveFilenameOf", () => {
  it("lowercases the name and separates words with dashes", () => {
    expect(archiveFilenameOf("My Shop App")).toBe("my-shop-app.zip");
  });

  it("drops unsafe characters and collapses repeated separators", () => {
    expect(archiveFilenameOf("  Shop / Cart: v2!!  ")).toBe("shop-cart-v2.zip");
  });

  it("falls back to a default name when nothing safe remains", () => {
    expect(archiveFilenameOf("???")).toBe("project.zip");
  });
});

describe("archiveProject", () => {
  it("returns a zip containing every listed file with its exact path and content", async () => {
    const query = archiveProject({
      boards: boardsNamed("Shop"),
      projectFiles: projectFilesReturning(files),
      archiveWriter: createFflateArchiveWriter(),
    });

    const archive = await query({ kind: "ArchiveProject", boardId: "board-1" });

    expect(archive?.filename).toBe("shop.zip");
    const entries = unzipSync(archive?.bytes ?? new Uint8Array());
    expect(Object.keys(entries).sort()).toEqual(files.map((file) => file.path).sort());
    files.forEach((file) => expect(strFromU8(entries[file.path])).toBe(file.content));
  });

  it("hands the listed files to the archive writer", async () => {
    const writer = createInMemoryArchiveWriter();
    const query = archiveProject({ boards: boardsNamed("Shop"), projectFiles: projectFilesReturning(files), archiveWriter: writer });

    await query({ kind: "ArchiveProject", boardId: "board-1" });

    expect(writer.archivedFiles()).toEqual(files);
  });

  it("archives the storage location of a board without a folder", async () => {
    const listed: string[] = [];
    const query = archiveProject({
      boards: createInMemoryBoardRepository([{ id: "board-2", name: "Cloud", rootPath: null }]),
      projectFiles: {
        list: async (location) => {
          listed.push(location);
          return files;
        },
      },
      archiveWriter: createInMemoryArchiveWriter(),
    });

    const archive = await query({ kind: "ArchiveProject", boardId: "board-2" });

    expect(archive?.filename).toBe("cloud.zip");
    expect(listed).toEqual(["storage:board-2"]);
  });

  it("returns null for a board that does not exist", async () => {
    const writer = createInMemoryArchiveWriter();
    const query = archiveProject({ boards: boardsNamed("Shop"), projectFiles: projectFilesReturning(files), archiveWriter: writer });

    expect(await query({ kind: "ArchiveProject", boardId: "missing" })).toBeNull();
    expect(writer.archivedFiles()).toEqual([]);
  });
});
