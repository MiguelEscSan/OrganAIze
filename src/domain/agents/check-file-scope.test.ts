import { describe, expect, it } from "vitest";
import { checkFileScope } from "./check-file-scope";

const allowed = ["src/app/page.tsx", "src/components/hero.tsx"];

describe("checkFileScope", () => {
  it("accepts writes to files inside the allowed list", () => {
    expect(checkFileScope([{ path: "src/app/page.tsx" }], allowed)).toEqual({ ok: true });
  });

  it("refuses a write to a file outside the allowed list", () => {
    expect(checkFileScope([{ path: "src/app/page.tsx" }, { path: "package.json" }], allowed)).toEqual({
      ok: false,
      reason: "Develop wrote outside its file scope: package.json. Allowed files: src/app/page.tsx, src/components/hero.tsx.",
    });
  });

  it("lists the allowed files in the refusal", () => {
    const result = checkFileScope([{ path: "package.json" }], ["App.tsx", "src/theme.ts"]);

    expect(result).toEqual({
      ok: false,
      reason: "Develop wrote outside its file scope: package.json. Allowed files: App.tsx, src/theme.ts.",
    });
  });

  it("suggests the allowed file that has the same base name as the refused path", () => {
    const result = checkFileScope([{ path: "src/App.tsx" }], ["App.tsx"]);

    expect(result).toEqual({
      ok: false,
      reason: "Develop wrote outside its file scope: src/App.tsx. Allowed files: App.tsx. Did you mean 'App.tsx'?",
    });
  });

  it("does not suggest when several allowed files share the base name", () => {
    const result = checkFileScope([{ path: "src/index.ts" }], ["a/index.ts", "b/index.ts"]);

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).not.toContain("Did you mean");
  });

  it("refuses a path that escapes the project with parent segments", () => {
    expect(checkFileScope([{ path: "src/../../secrets.env" }], allowed).ok).toBe(false);
  });

  it("refuses an absolute path", () => {
    expect(checkFileScope([{ path: "/etc/passwd" }], allowed).ok).toBe(false);
  });

  it("refuses a Windows absolute path", () => {
    expect(checkFileScope([{ path: "C:\\Users\\app.ts" }], allowed).ok).toBe(false);
  });

  it("refuses the app entry written as App.ts even when the subtask allows it", () => {
    expect(checkFileScope([{ path: "src/App.ts" }], ["src/App.ts"])).toEqual({
      ok: false,
      reason: "The app entry must be App.tsx, not App.ts: src/App.ts",
    });
  });

  it("accepts the app entry written as App.tsx", () => {
    expect(checkFileScope([{ path: "src/App.tsx" }], ["src/App.tsx"])).toEqual({ ok: true });
  });

  it("refuses an empty set of writes", () => {
    expect(checkFileScope([], allowed)).toEqual({ ok: false, reason: "Develop produced no file changes" });
  });
});
