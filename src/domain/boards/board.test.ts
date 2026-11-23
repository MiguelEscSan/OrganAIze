import { describe, expect, it } from "vitest";
import { normalizeBoardDetails } from "./board";

const appRoot = "C:\\Projects\\agent-team";

describe("normalizeBoardDetails", () => {
  it("accepts a board with a name and an absolute project root", () => {
    const outcome = normalizeBoardDetails({ name: " Shop ", rootPath: "C:\\Projects\\shop" }, appRoot);

    expect(outcome).toEqual({ ok: true, details: { name: "Shop", rootPath: "C:\\Projects\\shop" } });
  });

  it("refuses a blank name", () => {
    expect(normalizeBoardDetails({ name: " ", rootPath: "C:\\Projects\\shop" }, appRoot)).toEqual({
      ok: false,
      reason: "A board needs a name",
    });
  });

  it("refuses a relative project root", () => {
    expect(normalizeBoardDetails({ name: "Shop", rootPath: "shop" }, appRoot)).toEqual({
      ok: false,
      reason: "The project root must be an absolute path",
    });
  });

  it("refuses a project root that points at agent-team itself", () => {
    expect(normalizeBoardDetails({ name: "Self", rootPath: "C:/Projects/agent-team/" }, appRoot)).toEqual({
      ok: false,
      reason: "The project root cannot be the agent-team repository",
    });
  });

  it("refuses a project root that contains parent segments", () => {
    expect(normalizeBoardDetails({ name: "Shop", rootPath: "C:\\Projects\\..\\secrets" }, appRoot)).toEqual({
      ok: false,
      reason: "The project root cannot contain '..'",
    });
  });
});
