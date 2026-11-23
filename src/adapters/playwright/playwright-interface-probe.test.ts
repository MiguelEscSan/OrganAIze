import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createPlaywrightInterfaceProbe } from "./playwright-interface-probe";

const sampleRoot = path.resolve("test-fixtures/interface-sample");
const probeTimeoutMs = 90_000;

describe("createPlaywrightInterfaceProbe", () => {
  it("starts the dev server and returns the visible text of the page", async () => {
    const result = await createPlaywrightInterfaceProbe().inspect(sampleRoot);

    expect(result).toEqual({ ok: true, pageText: "Schedule", consoleErrors: [] });
  }, probeTimeoutMs);

  it("reports a project without a dev script as not started", async () => {
    const emptyRoot = await mkdtemp(path.join(tmpdir(), "interface-probe-"));

    const result = await createPlaywrightInterfaceProbe().inspect(emptyRoot);

    expect(result.ok).toBe(false);
  }, probeTimeoutMs);
});
