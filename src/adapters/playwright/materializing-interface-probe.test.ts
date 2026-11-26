import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { InterfaceProbe, InterfaceProbeResult } from "@/ports/interface-probe";
import type { ProjectFile, ProjectFiles } from "@/ports/project-files";
import { createMaterializingInterfaceProbe } from "./materializing-interface-probe";

const okResult: InterfaceProbeResult = { ok: true, pageText: "hello", consoleErrors: [] };

const filesFake = (files: ProjectFile[]): ProjectFiles => ({ list: async () => files });

type RecordingProbe = { probe: InterfaceProbe; received: string[]; seenContent: Record<string, string> };

const recordingProbe = (
  inspectedPaths: string[],
  behavior: (rootPath: string) => Promise<InterfaceProbeResult> = async () => okResult,
): RecordingProbe => {
  const received: string[] = [];
  const seenContent: Record<string, string> = {};

  return {
    received,
    seenContent,
    probe: {
      inspect: async (rootPath) => {
        received.push(rootPath);
        for (const relative of inspectedPaths) {
          seenContent[relative] = await readFile(path.join(rootPath, relative), "utf8");
        }

        return behavior(rootPath);
      },
    },
  };
};

describe("materializing interface probe", () => {
  it("writes storage files to a temp directory and inspects it", async () => {
    const recorder = recordingProbe(["package.json", "src/app/page.tsx"]);
    const probe = createMaterializingInterfaceProbe(
      recorder.probe,
      filesFake([
        { path: "package.json", content: "{}" },
        { path: "src/app/page.tsx", content: "export default 1;" },
      ]),
    );

    const result = await probe.inspect("storage:abc");

    expect(result).toEqual(okResult);
    expect(recorder.received).toHaveLength(1);
    expect(recorder.received[0]).not.toContain("storage:");
    expect(recorder.seenContent).toEqual({ "package.json": "{}", "src/app/page.tsx": "export default 1;" });
  });

  it("removes the temp directory after a successful inspection", async () => {
    const recorder = recordingProbe([]);
    const probe = createMaterializingInterfaceProbe(recorder.probe, filesFake([{ path: "a.txt", content: "a" }]));

    await probe.inspect("storage:abc");

    expect(existsSync(recorder.received[0])).toBe(false);
  });

  it("removes the temp directory when the inner probe throws", async () => {
    const recorder = recordingProbe([], async () => {
      throw new Error("boom");
    });
    const probe = createMaterializingInterfaceProbe(recorder.probe, filesFake([{ path: "a.txt", content: "a" }]));

    await expect(probe.inspect("storage:abc")).rejects.toThrow("boom");

    expect(existsSync(recorder.received[0])).toBe(false);
  });

  it("delegates a disk location untouched", async () => {
    const recorder = recordingProbe([]);
    let listed = false;
    const probe = createMaterializingInterfaceProbe(recorder.probe, {
      list: async () => {
        listed = true;

        return [];
      },
    });

    const result = await probe.inspect("C:/projects/site");

    expect(result).toEqual(okResult);
    expect(recorder.received).toEqual(["C:/projects/site"]);
    expect(listed).toBe(false);
  });

  it("fails without running the probe when the storage project has no files", async () => {
    const recorder = recordingProbe([]);
    const probe = createMaterializingInterfaceProbe(recorder.probe, filesFake([]));

    const result = await probe.inspect("storage:abc");

    expect(result.ok).toBe(false);
    expect(recorder.received).toEqual([]);
  });

  it("rejects a path that escapes the temp directory and cleans up", async () => {
    const recorder = recordingProbe([]);
    const probe = createMaterializingInterfaceProbe(
      recorder.probe,
      filesFake([{ path: "../escape.txt", content: "x" }]),
    );

    const result = await probe.inspect("storage:abc");

    expect(result.ok).toBe(false);
    expect(recorder.received).toEqual([]);
  });
});
