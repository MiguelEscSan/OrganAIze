import { describe, expect, it } from "vitest";
import { settleProjectFiles } from "./settle-project-files";

describe("settleProjectFiles", () => {
  it("reports the files when the project has them", async () => {
    const files = [{ path: "App.tsx", content: "export {}" }];

    expect(await settleProjectFiles(async () => files)).toEqual({ kind: "found", files });
  });

  it("reports a missing project when there is no board", async () => {
    expect(await settleProjectFiles(async () => null)).toEqual({ kind: "missing" });
  });

  it("reports the reason when the storage fails", async () => {
    const outcome = await settleProjectFiles(async () => {
      throw new Error("Missing required environment variable SUPABASE_URL");
    });

    expect(outcome).toEqual({
      kind: "unavailable",
      reason: "Missing required environment variable SUPABASE_URL",
    });
  });

  it("reports a generic reason when the failure is not an error", async () => {
    const outcome = await settleProjectFiles(async () => {
      throw "boom";
    });

    expect(outcome).toEqual({ kind: "unavailable", reason: "The project files could not be read" });
  });
});
