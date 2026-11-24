import { describe, expect, it } from "vitest";
import type { ProjectFile } from "@/ports/project-files";
import { filesChanged } from "./files-changed";

const app: ProjectFile = { path: "App.tsx", content: "export default function App() {}" };
const style: ProjectFile = { path: "styles.css", content: "body {}" };

describe("filesChanged", () => {
  it("reports no change when the same files come back in the same order", () => {
    expect(filesChanged([app, style], [app, style])).toBe(false);
  });

  it("reports a change when a file's content differs", () => {
    expect(filesChanged([app], [{ ...app, content: "export default function App() { return null; }" }])).toBe(true);
  });

  it("reports a change when a file is added", () => {
    expect(filesChanged([app], [app, style])).toBe(true);
  });

  it("reports a change when a file is removed", () => {
    expect(filesChanged([app, style], [app])).toBe(true);
  });
});
