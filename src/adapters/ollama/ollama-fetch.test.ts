import { describe, expect, it } from "vitest";
import { createOllamaFetch } from "./ollama-fetch";

describe("createOllamaFetch", () => {
  it("sends requests through a dispatcher without headers or body timeouts", async () => {
    const agentOptions: unknown[] = [];
    const dispatcher = { name: "dispatcher" };
    const received: { url: string; init: Record<string, unknown> }[] = [];
    const fetcher = createOllamaFetch(
      async (url, init) => {
        received.push({ url, init: { ...init } });
        return new Response("");
      },
      (options) => {
        agentOptions.push(options);
        return dispatcher as never;
      },
    );

    await fetcher("http://127.0.0.1:11434/api/chat", { method: "POST", headers: {}, body: "{}" });

    expect(agentOptions).toEqual([{ headersTimeout: 0, bodyTimeout: 0 }]);
    expect(received[0].url).toBe("http://127.0.0.1:11434/api/chat");
    expect(received[0].init.method).toBe("POST");
    expect(received[0].init.dispatcher).toBe(dispatcher);
  });
});
