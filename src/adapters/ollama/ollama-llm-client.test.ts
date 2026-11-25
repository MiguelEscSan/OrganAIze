import { describe, expect, it } from "vitest";
import { createOllamaLlmClient, type OllamaFetch } from "./ollama-llm-client";

const config = { baseUrl: "http://127.0.0.1:11434", model: "qwen3:4b-instruct" };

const streamingReply = (chunks: unknown[]): { fetcher: OllamaFetch; calls: { url: string; body: string }[] } => {
  const calls: { url: string; body: string }[] = [];
  const fetcher: OllamaFetch = async (url, init) => {
    calls.push({ url, body: init.body });
    return { ok: true, status: 200, text: async () => chunks.map((chunk) => JSON.stringify(chunk)).join("\n") };
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

  it("joins the streamed pieces into one JSON reply and counts the tokens", async () => {
    const { fetcher } = streamingReply([
      { message: { content: "{\"subtasks\":" }, done: false },
      { message: { content: "[]}" }, done: false },
      { message: { content: "" }, done: true, prompt_eval_count: 12, eval_count: 30 },
    ]);

    const reply = await createOllamaLlmClient(config, fetcher).generateJson("split this");

    expect(reply).toEqual({ ok: true, json: { subtasks: [] }, totalTokens: 42 });
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

    expect(reply).toEqual({ ok: false, reason: "Ollama request failed: fetch failed" });
  });

  it("fails with the status when the server refuses the request", async () => {
    const fetcher: OllamaFetch = async () => ({ ok: false, status: 404, text: async () => "" });

    const reply = await createOllamaLlmClient(config, fetcher).generateJson("split this");

    expect(reply).toEqual({ ok: false, reason: "Ollama request failed with status 404" });
  });
});
