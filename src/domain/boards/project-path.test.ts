import { describe, expect, it } from "vitest";
import { isInsideRoot, isAbsolutePath } from "./project-path";

describe("isAbsolutePath", () => {
  it("recognises Windows drive paths and POSIX root paths", () => {
    expect(isAbsolutePath("C:\\Projects\\shop")).toBe(true);
    expect(isAbsolutePath("C:/Projects/shop")).toBe(true);
    expect(isAbsolutePath("/home/dev/shop")).toBe(true);
  });

  it("treats relative paths as not absolute", () => {
    expect(isAbsolutePath("src/app/page.tsx")).toBe(false);
  });
});

describe("isInsideRoot", () => {
  it("accepts relative files with either separator", () => {
    expect(isInsideRoot("src/app/page.tsx")).toBe(true);
    expect(isInsideRoot("src\\app\\page.tsx")).toBe(true);
  });

  it("rejects files that climb out of the root", () => {
    expect(isInsideRoot("../other/secret.ts")).toBe(false);
    expect(isInsideRoot("src/../../secret.ts")).toBe(false);
  });

  it("rejects absolute file paths", () => {
    expect(isInsideRoot("C:\\Windows\\system.ini")).toBe(false);
    expect(isInsideRoot("/etc/hosts")).toBe(false);
  });

  it("rejects an empty file path", () => {
    expect(isInsideRoot("  ")).toBe(false);
  });
});
