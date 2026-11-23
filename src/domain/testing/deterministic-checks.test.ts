import { describe, expect, it } from "vitest";
import { runDeterministicChecks } from "./deterministic-checks";

const validCard = [
  "export const Card = () => (",
  "  <section>",
  "    <p>hello</p>",
  "  </section>",
  ");",
].join("\n");

const unclosedCard = [
  "export const Card = () => (",
  "  <section>",
  "    <p>hello</p>",
  ");",
].join("\n");

describe("runDeterministicChecks", () => {
  it("reports a declared file that is missing from the workspace", () => {
    const failures = runDeterministicChecks([{ path: "src/app/card.tsx", content: null }]);

    expect(failures).toEqual([
      { file: "src/app/card.tsx", line: null, message: "File src/app/card.tsx does not exist" },
    ]);
  });

  it("reports a tsx syntax error with its file and line", () => {
    const failures = runDeterministicChecks([{ path: "src/app/card.tsx", content: unclosedCard }]);

    expect(failures[0]).toMatchObject({ file: "src/app/card.tsx", line: 2 });
    expect(failures[0]?.message).toContain("Syntax error");
    expect(failures[0]?.message).toContain("section");
  });

  it("reports no failures for a valid tsx file", () => {
    expect(runDeterministicChecks([{ path: "src/app/card.tsx", content: validCard }])).toEqual([]);
  });

  it("skips the syntax check for files that are not typescript", () => {
    expect(runDeterministicChecks([{ path: "docs/notes.md", content: "<section>" }])).toEqual([]);
  });
});
