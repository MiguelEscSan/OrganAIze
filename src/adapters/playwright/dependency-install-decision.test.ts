import { describe, expect, it } from "vitest";
import { needsDependencyInstall } from "./dependency-install-decision";

describe("needsDependencyInstall", () => {
  it("installs when the project declares dependencies and node_modules is missing", () => {
    expect(needsDependencyInstall('{"dependencies":{"react":"^19.0.0"}}', false)).toBe(true);
  });

  it("installs when the project declares only dev dependencies and node_modules is missing", () => {
    expect(needsDependencyInstall('{"devDependencies":{"typescript":"^5.0.0"}}', false)).toBe(true);
  });

  it("does not install when node_modules already exists", () => {
    expect(needsDependencyInstall('{"dependencies":{"react":"^19.0.0"}}', true)).toBe(false);
  });

  it("does not install when the project declares no dependencies", () => {
    expect(needsDependencyInstall('{"name":"sample","scripts":{"dev":"node server.mjs"}}', false)).toBe(false);
    expect(needsDependencyInstall('{"dependencies":{},"devDependencies":{}}', false)).toBe(false);
  });

  it("does not install when there is no package.json or it cannot be parsed", () => {
    expect(needsDependencyInstall(null, false)).toBe(false);
    expect(needsDependencyInstall("not json", false)).toBe(false);
  });
});
