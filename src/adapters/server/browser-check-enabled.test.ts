import { describe, expect, it } from "vitest";
import { browserCheckEnabledIn } from "./browser-check-enabled";

describe("browser check availability", () => {
  it("is enabled only when the environment flag is exactly true", () => {
    expect(browserCheckEnabledIn({ BROWSER_CHECK_ENABLED: "true" })).toBe(true);
  });

  it("is disabled when the flag is missing", () => {
    expect(browserCheckEnabledIn({})).toBe(false);
  });

  it("is disabled for any other value", () => {
    expect(browserCheckEnabledIn({ BROWSER_CHECK_ENABLED: "false" })).toBe(false);
    expect(browserCheckEnabledIn({ BROWSER_CHECK_ENABLED: "1" })).toBe(false);
  });
});
