import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createUndiciOllamaFetch } from "./ollama-fetch";

let server: Server | null = null;

const startServer = async (respond: (body: string) => string): Promise<string> => {
  server = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk) => {
      body += String(chunk);
    });
    request.on("end", () => {
      response.writeHead(200, { "content-type": "application/x-ndjson" });
      response.end(respond(body));
    });
  });
  await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve));

  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
};

afterEach(async () => {
  await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
  server = null;
});

describe("createUndiciOllamaFetch", () => {
  it("completes a real streamed request against a local server", async () => {
    const baseUrl = await startServer((body) => `${JSON.stringify({ echoed: JSON.parse(body) })}\n`);
    const fetcher = createUndiciOllamaFetch();

    const response = await fetcher(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: "m" }),
    });

    expect(response.ok).toBe(true);
    expect(JSON.parse(await response.text())).toEqual({ echoed: { model: "m" } });
  });

  it("exposes a readable body stream", async () => {
    const baseUrl = await startServer(() => "line one\nline two\n");
    const fetcher = createUndiciOllamaFetch();

    const response = await fetcher(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    const reader = response.body?.getReader();
    const chunk = await reader?.read();

    expect(new TextDecoder().decode(chunk?.value)).toContain("line one");
  });
});
