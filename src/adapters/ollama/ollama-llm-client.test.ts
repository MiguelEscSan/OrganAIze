import { describe, expect, it } from "vitest";
import { createOllamaLlmClient, type OllamaFetch } from "./ollama-llm-client";

const config = { baseUrl: "http://127.0.0.1:11434", model: "qwen3:4b-instruct", numCtx: 8192 };

const streamingReply = (chunks: unknown[]): { fetcher: OllamaFetch; calls: { url: string; body: string }[] } => {
  const calls: { url: string; body: string }[] = [];
  const fetcher: OllamaFetch = async (url, init) => {
    calls.push({ url, body: init.body });
    return new Response(chunks.map((chunk) => JSON.stringify(chunk)).join("\n"));
  };

  return { fetcher, calls };
};

describe("ollama llm client", () => {
  it("sends the prompt to the local chat endpoint asking for JSON with streaming", async () => {
    const { fetcher, calls } = streamingReply([{ message: { content: "{\"ok\":true}" }, done: true }]);

    await createOllamaLlmClient(config, fetcher).generateJson("split this");

    expect(calls[0].url).toBe("http://127.0.0.1:11434/api/chat");
    expect(JSON.parse(calls[0].body)).toEqual({
      model: "qwen3:4b-instruct",
      stream: true,
      format: "json",
      options: { num_ctx: 8192 },
      messages: [{ role: "user", content: "split this" }],
    });
  });

  it("sends the configured context window as num_ctx", async () => {
    const { fetcher, calls } = streamingReply([{ message: { content: "{}" }, done: true }]);

    await createOllamaLlmClient({ ...config, numCtx: 4096 }, fetcher).generateJson("split this");

    expect(JSON.parse(calls[0].body).options).toEqual({ num_ctx: 4096 });
  });

  it("declares its context window in tokens", () => {
    const { fetcher } = streamingReply([]);

    expect(createOllamaLlmClient({ ...config, numCtx: 4096 }, fetcher).contextWindowTokens).toBe(4096);
  });

  it("joins the streamed pieces into one JSON reply and counts the tokens", async () => {
    const { fetcher } = streamingReply([
      { message: { content: "{\"subtasks\":" }, done: false },
      { message: { content: "[]}" }, done: false },
      { message: { content: "" }, done: true, prompt_eval_count: 12, eval_count: 30 },
    ]);

    const reply = await createOllamaLlmClient(config, fetcher).generateJson("split this");

    expect(reply).toEqual({ ok: true, json: { subtasks: [] }, totalTokens: 42 });
  });

  it("reports the characters received each time the reply grows", async () => {
    const { fetcher } = streamingReply([
      { message: { content: "{\"a\":" }, done: false },
      { message: { content: "1}" }, done: false },
      { message: { content: "" }, done: true, prompt_eval_count: 1, eval_count: 1 },
    ]);
    const reported: number[] = [];

    await createOllamaLlmClient(config, fetcher).generateJson("split this", async (progress) => {
      reported.push(progress.characters);
    });

    expect(reported).toEqual([5, 7]);
  });

  it("reads a reply whose lines arrive split across network chunks", async () => {
    const line = JSON.stringify({ message: { content: "{\"ok\":true}" }, done: true });
    const middle = Math.floor(line.length / 2);
    const encoder = new TextEncoder();
    const fetcher: OllamaFetch = async () => {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode(line.slice(0, middle)));
          controller.enqueue(encoder.encode(`${line.slice(middle)}\n`));
          controller.close();
        },
      });
      return new Response(stream);
    };

    const reply = await createOllamaLlmClient(config, fetcher).generateJson("split this");

    expect(reply).toEqual({ ok: true, json: { ok: true }, totalTokens: 0 });
  });

  it("fails when the streamed reply is not valid JSON", async () => {
    const { fetcher } = streamingReply([{ message: { content: "not json" }, done: true }]);

    const reply = await createOllamaLlmClient(config, fetcher).generateJson("split this");

    expect(reply).toEqual({ ok: false, reason: "Ollama reply is not valid JSON" });
  });

  it("fails when the stream has no text", async () => {
    const { fetcher } = streamingReply([{ done: true }]);

    const reply = await createOllamaLlmClient(config, fetcher).generateJson("split this");

    expect(reply).toEqual({ ok: false, reason: "Ollama reply has no text" });
  });

  it("fails with a reason instead of throwing when the request itself breaks off", async () => {
    const fetcher: OllamaFetch = async () => {
      throw new Error("fetch failed");
    };

    const reply = await createOllamaLlmClient(config, fetcher).generateJson("review this");

    expect(reply).toEqual({ ok: false, reason: "Ollama request failed: fetch failed", unavailable: true });
  });

  it("fails with the status when the server refuses the request", async () => {
    const fetcher: OllamaFetch = async () => new Response("", { status: 404 });

    const reply = await createOllamaLlmClient(config, fetcher).generateJson("split this");

    expect(reply).toEqual({ ok: false, reason: "Ollama request failed with status 404", unavailable: true });
  });
});
