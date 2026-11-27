import { describe, expect, it } from "vitest";
import { describePaths } from "./describe-paths";

describe("describePaths", () => {
  it("names a single path as it is", () => {
    expect(describePaths(["src/app/page.tsx"])).toBe("src/app/page.tsx");
  });

  it("lists up to three paths separated by commas", () => {
    expect(describePaths(["a.ts", "b.ts", "c.ts"])).toBe("a.ts, b.ts, c.ts");
  });

  it("counts the paths beyond the third", () => {
    expect(describePaths(["a.ts", "b.ts", "c.ts", "d.ts"])).toBe("a.ts, b.ts, c.ts and 1 more");
    expect(describePaths(["a.ts", "b.ts", "c.ts", "d.ts", "e.ts", "f.ts"])).toBe("a.ts, b.ts, c.ts and 3 more");
  });

  it("says there are no files when the list is empty", () => {
    expect(describePaths([])).toBe("no files");
  });
});
