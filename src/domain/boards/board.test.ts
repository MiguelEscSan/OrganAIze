import { describe, expect, it } from "vitest";
import { isStorageLocation, normalizeBoardDetails, workspaceLocationOf } from "./board";

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

  it("treats a blank project root as no folder", () => {
    expect(normalizeBoardDetails({ name: "Shop", rootPath: "   " }, appRoot)).toEqual({
      ok: true,
      details: { name: "Shop", rootPath: null },
    });
  });

  it("treats a missing project root as no folder", () => {
    expect(normalizeBoardDetails({ name: "Shop" }, appRoot)).toEqual({
      ok: true,
      details: { name: "Shop", rootPath: null },
    });
    expect(normalizeBoardDetails({ name: "Shop", rootPath: null }, appRoot)).toEqual({
      ok: true,
      details: { name: "Shop", rootPath: null },
    });
  });
});

describe("workspaceLocationOf", () => {
  it("is the folder when the board has one", () => {
    expect(workspaceLocationOf({ id: "b1", name: "Shop", rootPath: "C:/Projects/shop" })).toBe("C:/Projects/shop");
  });

  it("is a storage location named after the board when it has no folder", () => {
    expect(workspaceLocationOf({ id: "b1", name: "Shop", rootPath: null })).toBe("storage:b1");
  });
});

describe("isStorageLocation", () => {
  it("recognises storage locations only", () => {
    expect(isStorageLocation("storage:b1")).toBe(true);
    expect(isStorageLocation("C:/Projects/shop")).toBe(false);
  });
});
