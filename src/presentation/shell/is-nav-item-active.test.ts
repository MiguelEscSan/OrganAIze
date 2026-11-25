import { describe, expect, it } from "vitest";
import { isNavItemActive } from "./is-nav-item-active";

describe("isNavItemActive", () => {
  it("is active on the exact path", () => {
    expect(isNavItemActive("/projects", "/projects")).toBe(true);
  });

  it("is active on a nested path", () => {
    expect(isNavItemActive("/projects/abc/files", "/projects")).toBe(true);
  });

  it("is not active on another section", () => {
    expect(isNavItemActive("/team", "/projects")).toBe(false);
  });

  it("is not active on a path that only shares the prefix text", () => {
    expect(isNavItemActive("/projectsfoo", "/projects")).toBe(false);
  });
});
