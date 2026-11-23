import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { chromium } from "playwright";
import type { InterfaceProbe, InterfaceProbeResult } from "@/ports/interface-probe";

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

const startDevServer = (rootPath: string, port: number): ChildProcess =>
  spawn("npm run dev", {
    cwd: rootPath,
    env: { ...process.env, PORT: String(port) },
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
    const port = await freePort();
    const url = `http://127.0.0.1:${port}`;
    const server = startDevServer(rootPath, port);

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
