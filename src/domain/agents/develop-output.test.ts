import { describe, expect, it } from "vitest";
import { parseDevelopOutput } from "./develop-output";

describe("parseDevelopOutput", () => {
  it("accepts a list of files with their full content", () => {
    const outcome = parseDevelopOutput({ files: [{ path: "src/app/page.tsx", content: "export default 1;" }] });

    expect(outcome).toEqual({
      ok: true,
      output: { files: [{ path: "src/app/page.tsx", content: "export default 1;" }] },
    });
  });

  it("refuses an output with no files", () => {
    expect(parseDevelopOutput({ files: [] }).ok).toBe(false);
  });

  it("refuses a file without content", () => {
    expect(parseDevelopOutput({ files: [{ path: "src/app/page.tsx" }] }).ok).toBe(false);
  });

  it("refuses a value that is not an object", () => {
    expect(parseDevelopOutput("export default 1;").ok).toBe(false);
  });
});
