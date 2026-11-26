import { spawn, type ChildProcess } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { createServer } from "node:net";
import { join } from "node:path";
import { chromium } from "playwright";
import type { InterfaceProbe, InterfaceProbeResult } from "@/ports/interface-probe";
import { declaredDependencyNames, needsDependencyInstall } from "./dependency-install-decision";
import { devCommandFor } from "./dev-command";

const installTimeoutMs = 5 * 60_000;
const startupTimeoutMs = 60_000;
const pollIntervalMs = 500;
const pageTextLimit = 4000;

const freePort = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const probeServer = createServer();

    probeServer.once("error", reject);
    probeServer.listen(0, "127.0.0.1", () => {
      const address = probeServer.address();

      probeServer.close(() =>
        typeof address === "object" && address !== null ? resolve(address.port) : reject(new Error("No port available")),
      );
    });
  });

const isReachable = async (url: string): Promise<boolean> => {
  try {
    await fetch(url);
    return true;
  } catch {
    return false;
  }
};

const waitUntilReachable = async (url: string, server: ChildProcess): Promise<boolean> => {
  const deadline = Date.now() + startupTimeoutMs;

  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      return false;
    }

    if (await isReachable(url)) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  return false;
};

const startDevServer = (rootPath: string, port: number, command: string): ChildProcess =>
  spawn(command, {
    cwd: rootPath,
    env: { ...process.env, NODE_ENV: "development", PORT: String(port) },
    shell: true,
    stdio: "ignore",
    detached: process.platform !== "win32",
  });

const stopDevServer = (server: ChildProcess): Promise<void> =>
  new Promise((resolve) => {
    if (server.pid === undefined || server.exitCode !== null) {
      resolve();
      return;
    }

    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" }).once("exit", () => resolve());
      return;
    }

    process.kill(-server.pid, "SIGTERM");
    resolve();
  });

const readIfPresent = async (filePath: string): Promise<string | null> => {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
};

const exists = async (path: string): Promise<boolean> => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

const installedNamesOf = async (rootPath: string, names: readonly string[]): Promise<string[]> => {
  const present = await Promise.all(names.map((name) => exists(join(rootPath, "node_modules", name))));

  return names.filter((_, index) => present[index]);
};

const installDependencies = (rootPath: string): Promise<string | null> =>
  new Promise((resolve) => {
    const installer = spawn("npm install --no-audit --no-fund --ignore-scripts --include=dev", {
      cwd: rootPath,
      env: { ...process.env, NODE_ENV: "development" },
      shell: true,
      stdio: "ignore",
    });
    const timer = setTimeout(() => {
      void stopDevServer(installer);
      resolve(`npm install did not finish within ${installTimeoutMs / 60_000} minutes`);
    }, installTimeoutMs);

    installer.once("error", (error) => {
      clearTimeout(timer);
      resolve(`npm install could not start: ${error.message}`);
    });
    installer.once("exit", (code) => {
      clearTimeout(timer);
      resolve(code === 0 ? null : `npm install failed with exit code ${code}`);
    });
  });

const installFailureOf = async (rootPath: string): Promise<string | null> => {
  const packageJson = await readIfPresent(join(rootPath, "package.json"));
  const installed = await installedNamesOf(rootPath, declaredDependencyNames(packageJson));

  return needsDependencyInstall(packageJson, installed) ? installDependencies(rootPath) : null;
};

const readPage = async (url: string): Promise<InterfaceProbeResult> => {
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    const consoleErrors: string[] = [];

    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));

    await page.goto(url, { waitUntil: "load" });

    const pageText = (await page.innerText("body")).trim().slice(0, pageTextLimit);

    return { ok: true, pageText, consoleErrors };
  } finally {
    await browser.close();
  }
};

export const createPlaywrightInterfaceProbe = (): InterfaceProbe => ({
  inspect: async (rootPath: string): Promise<InterfaceProbeResult> => {
    const installFailure = await installFailureOf(rootPath);

    if (installFailure !== null) {
      return { ok: false, reason: installFailure };
    }

    const port = await freePort();
    const url = `http://127.0.0.1:${port}`;
    const command = devCommandFor(await readIfPresent(join(rootPath, "package.json")), port);
    const server = startDevServer(rootPath, port, command);

    try {
      if (!(await waitUntilReachable(url, server))) {
        return { ok: false, reason: `the dev server did not answer on ${url}` };
      }

      return await readPage(url);
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : "the page could not be read" };
    } finally {
      await stopDevServer(server);
    }
  },
});
