import { describe, expect, it } from "vitest";
import type { ProjectFile } from "@/ports/project-files";
import { createTypeScriptProjectTypeChecker } from "./typescript-project-type-checker";

const checker = createTypeScriptProjectTypeChecker();

const filesOf = (contents: Record<string, string>): ProjectFile[] =>
  Object.entries(contents).map(([path, content]) => ({ path, content }));

const weatherService = ["export const fetchWeather = (city: string): string => city;", "export type Forecast = { city: string };"].join("\n");

const correctComponent = [
  'import { useEffect, useState } from "react";',
  'import { fetchWeather } from "./weatherService";',
  "",
  "type Props = { city: string };",
  "",
  "export const App = ({ city }: Props) => {",
  '  const [report, setReport] = useState<string>("");',
  "  useEffect(() => {",
  "    setReport(fetchWeather(city));",
  "  }, [city]);",
  "  return (",
  "    <main>",
  "      <h1>{report}</h1>",
  "      <button onClick={() => setReport('')}>Clear</button>",
  "    </main>",
  "  );",
  "};",
].join("\n");

describe("TypeScript project type checker", () => {
  it("reports a relative import that does not resolve with the file and line", async () => {
    const files = filesOf({
      "src/weatherService.ts": weatherService,
      "src/App.tsx": ['import { fetchWeather } from "./weatherServices";', "export const App = () => fetchWeather('x');"].join("\n"),
    });

    const failures = await checker.check(files, ["src/App.tsx"]);

    expect(failures).toEqual([expect.objectContaining({ file: "src/App.tsx", line: 1, message: expect.stringContaining("./weatherServices") })]);
  });

  it("suggests the path of a file with the same base name for an unresolved sibling import", async () => {
    const files = filesOf({
      "src/weatherService.ts": weatherService,
      "App.tsx": ['import { fetchWeather } from "./weatherService";', "export const App = () => fetchWeather('x');"].join("\n"),
    });

    const failures = await checker.check(files, ["App.tsx"]);

    expect(failures).toHaveLength(1);
    expect(failures[0]?.message).toContain("Did you mean './src/weatherService'?");
  });

  it("suggests a sibling path relative to the importing file for a wrong parent import", async () => {
    const files = filesOf({
      "src/weatherService.ts": weatherService,
      "src/WeatherDisplay.tsx": ['import { fetchWeather } from "../weatherService";', "export const WeatherDisplay = () => fetchWeather('x');"].join("\n"),
    });

    const failures = await checker.check(files, ["src/WeatherDisplay.tsx"]);

    expect(failures[0]?.message).toContain("Did you mean './weatherService'?");
  });

  it("lists every file that shares the base name", async () => {
    const files = filesOf({
      "src/a/weatherService.ts": weatherService,
      "src/b/weatherService.ts": weatherService,
      "App.tsx": ['import { fetchWeather } from "./weatherService";', "export const App = () => fetchWeather('x');"].join("\n"),
    });

    const failures = await checker.check(files, ["App.tsx"]);

    expect(failures[0]?.message).toContain("Did you mean './src/a/weatherService', './src/b/weatherService'?");
  });

  it("lists at most three suggestions", async () => {
    const files = filesOf({
      "a/weatherService.ts": weatherService,
      "b/weatherService.ts": weatherService,
      "c/weatherService.ts": weatherService,
      "d/weatherService.ts": weatherService,
      "App.tsx": ['import { fetchWeather } from "./weatherService";', "export const App = () => fetchWeather('x');"].join("\n"),
    });

    const failures = await checker.check(files, ["App.tsx"]);

    expect(failures[0]?.message).toContain("Did you mean './a/weatherService', './b/weatherService', './c/weatherService'?");
    expect(failures[0]?.message).not.toContain("./d/weatherService");
  });

  it("suggests the folder of an index file", async () => {
    const files = filesOf({
      "src/utils/index.ts": "export const double = (value: number): number => value * 2;",
      "src/App.tsx": ['import { double } from "./helpers/utils";', "export const App = () => double(2);"].join("\n"),
    });

    const failures = await checker.check(files, ["src/App.tsx"]);

    expect(failures[0]?.message).toContain("Did you mean './utils'?");
  });

  it("adds no suggestion when no file has the base name", async () => {
    const files = filesOf({
      "src/weatherService.ts": weatherService,
      "src/App.tsx": ['import { fetchForecast } from "./forecastService";', "export const App = () => fetchForecast('x');"].join("\n"),
    });

    const failures = await checker.check(files, ["src/App.tsx"]);

    expect(failures).toHaveLength(1);
    expect(failures[0]?.message).not.toContain("Did you mean");
  });

  it("does not suggest the importing file itself or non-code files", async () => {
    const files = filesOf({
      "src/App.tsx": ['import { value } from "./helpers/App";', "export const App = () => value;"].join("\n"),
      "src/helpers/App.css": "body {}",
    });

    const failures = await checker.check(files, ["src/App.tsx"]);

    expect(failures[0]?.message).not.toContain("Did you mean");
  });

  it("accepts a relative import written with a js extension", async () => {
    const files = filesOf({
      "src/weatherService.ts": weatherService,
      "src/App.tsx": ['import { fetchWeather } from "./weatherService.js";', "export const App = () => fetchWeather('x');"].join("\n"),
    });

    expect(await checker.check(files, ["src/App.tsx"])).toEqual([]);
  });

  it("reports a named import that the target file does not export", async () => {
    const files = filesOf({
      "src/weatherService.ts": weatherService,
      "src/App.tsx": ['import { fetchForecast } from "./weatherService";', "export const App = () => fetchForecast('x');"].join("\n"),
    });

    const failures = await checker.check(files, ["src/App.tsx"]);

    expect(failures).toEqual([expect.objectContaining({ file: "src/App.tsx", line: 1, message: expect.stringContaining("fetchForecast") })]);
  });

  it("reports an unknown type name with the file and line", async () => {
    const files = filesOf({
      "src/App.tsx": ["export const describe = (error: PositionError): string => {", "  return String(error);", "};"].join("\n"),
    });

    const failures = await checker.check(files, ["src/App.tsx"]);

    expect(failures).toEqual([expect.objectContaining({ file: "src/App.tsx", line: 1, message: expect.stringContaining("PositionError") })]);
  });

  it("reports nothing for a correct React component that imports react and a resolvable sibling", async () => {
    const files = filesOf({ "src/weatherService.ts": weatherService, "src/App.tsx": correctComponent });

    expect(await checker.check(files, ["src/App.tsx"])).toEqual([]);
  });

  it("reports nothing for a component that depends on several uninstalled packages and asset imports", async () => {
    const component = [
      'import React, { createContext, useContext, useRef, type ReactNode, type FC } from "react";',
      'import { createRoot } from "react-dom/client";',
      'import clsx from "clsx";',
      'import styles from "./app.module.css";',
      'import "./index.css";',
      "const Ctx = createContext<string[]>([]);",
      "const Box: FC<{ children: ReactNode }> = ({ children }) => <div className={clsx(styles.box)}>{children}</div>;",
      "export default function App(props: { children?: React.ReactNode }) {",
      "  const ref = useRef<HTMLInputElement>(null);",
      "  const names = useContext(Ctx);",
      "  const url = import.meta.env.VITE_URL;",
      "  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => console.log(event.target.value);",
      "  return <Box><input ref={ref} onChange={onChange} />{props.children}{names.length}{url}</Box>;",
      "}",
      "createRoot(document.getElementById('root')!).render(<App />);",
    ].join("\n");

    const failures = await checker.check(filesOf({ "src/App.tsx": component, "src/app.module.css": "" }), ["src/App.tsx"]);

    expect(failures).toEqual([]);
  });

  it("does not report errors located in files outside the subtask", async () => {
    const files = filesOf({
      "src/weatherService.ts": weatherService,
      "src/other.ts": 'import { missing } from "./nowhere";\nexport const value: Unknown = missing;',
      "src/App.tsx": correctComponent,
    });

    expect(await checker.check(files, ["src/App.tsx"])).toEqual([]);
  });

  it("resolves a sibling in src and an index file in a folder", async () => {
    const files = filesOf({
      "src/utils/index.ts": "export const double = (value: number): number => value * 2;",
      "src/theme.ts": 'export const theme = "dark";',
      "src/App.tsx": ['import { double } from "./utils";', 'import { theme } from "./theme";', "export const App = () => `${theme}${double(2)}`;"].join("\n"),
    });

    expect(await checker.check(files, ["src/App.tsx"])).toEqual([]);
  });

  it("reports a call with the wrong number of arguments", async () => {
    const files = filesOf({
      "src/weatherService.ts": weatherService,
      "src/App.tsx": ['import { fetchWeather } from "./weatherService";', "export const App = () => fetchWeather('x', 'y');"].join("\n"),
    });

    const failures = await checker.check(files, ["src/App.tsx"]);

    expect(failures).toEqual([expect.objectContaining({ file: "src/App.tsx", line: 2 })]);
  });

  it("reports nothing for a file that is not TypeScript", async () => {
    const files = filesOf({ "src/App.tsx": correctComponent, "styles.css": "body { color: red }" });

    expect(await checker.check(files, ["styles.css"])).toEqual([]);
  });
});
