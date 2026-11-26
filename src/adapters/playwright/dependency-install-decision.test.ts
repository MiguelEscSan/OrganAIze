import { describe, expect, it } from "vitest";
import { declaredDependencyNames, needsDependencyInstall } from "./dependency-install-decision";

describe("declaredDependencyNames", () => {
  it("lists dependencies and dev dependencies", () => {
    const manifest = '{"dependencies":{"react":"^19.0.0"},"devDependencies":{"vite":"^5.0.0","@vitejs/plugin-react":"^4.0.0"}}';

    expect(declaredDependencyNames(manifest)).toEqual(["react", "vite", "@vitejs/plugin-react"]);
  });

  it("lists nothing when there is no manifest, it cannot be parsed or it declares nothing", () => {
    expect(declaredDependencyNames(null)).toEqual([]);
    expect(declaredDependencyNames("not json")).toEqual([]);
    expect(declaredDependencyNames('{"name":"sample"}')).toEqual([]);
  });
});

describe("needsDependencyInstall", () => {
  it("installs when the project declares dependencies and none is installed", () => {
    expect(needsDependencyInstall('{"dependencies":{"react":"^19.0.0"}}', [])).toBe(true);
  });

  it("installs when the project declares only dev dependencies and none is installed", () => {
    expect(needsDependencyInstall('{"devDependencies":{"typescript":"^5.0.0"}}', [])).toBe(true);
  });

  it("installs when a dev dependency is missing although others are installed", () => {
    const manifest = '{"dependencies":{"react":"^19.0.0"},"devDependencies":{"vite":"^5.0.0"}}';

    expect(needsDependencyInstall(manifest, ["react"])).toBe(true);
  });

  it("does not install when every declared dependency is installed", () => {
    const manifest = '{"dependencies":{"react":"^19.0.0"},"devDependencies":{"vite":"^5.0.0"}}';

    expect(needsDependencyInstall(manifest, ["react", "vite"])).toBe(false);
  });

  it("does not install when the project declares no dependencies", () => {
    expect(needsDependencyInstall('{"name":"sample","scripts":{"dev":"node server.mjs"}}', [])).toBe(false);
    expect(needsDependencyInstall('{"dependencies":{},"devDependencies":{}}', [])).toBe(false);
  });

  it("does not install when there is no package.json or it cannot be parsed", () => {
    expect(needsDependencyInstall(null, [])).toBe(false);
    expect(needsDependencyInstall("not json", [])).toBe(false);
  });
});
