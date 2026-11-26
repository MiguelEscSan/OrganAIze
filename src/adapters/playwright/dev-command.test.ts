import { describe, expect, it } from "vitest";
import { devCommandFor } from "./dev-command";

const packageWithDev = (dev: string | null): string =>
  JSON.stringify({ scripts: dev === null ? {} : { dev } });

describe("devCommandFor", () => {
  it.each(["vite", "vite --open", "vite --mode development"])(
    "forces the port and the loopback host when the dev script runs %s",
    (dev) => {
      expect(devCommandFor(packageWithDev(dev), 5555)).toBe(
        "npm run dev -- --host 127.0.0.1 --port 5555 --strictPort",
      );
    },
  );

  it.each(["next dev", "node server.mjs", "react-scripts start"])(
    "keeps the plain command when the dev script runs %s",
    (dev) => {
      expect(devCommandFor(packageWithDev(dev), 5555)).toBe("npm run dev");
    },
  );

  it("keeps the plain command when there is no dev script", () => {
    expect(devCommandFor(packageWithDev(null), 5555)).toBe("npm run dev");
  });

  it("keeps the plain command when package.json is missing or invalid", () => {
    expect(devCommandFor(null, 5555)).toBe("npm run dev");
    expect(devCommandFor("{ not json", 5555)).toBe("npm run dev");
  });
});
