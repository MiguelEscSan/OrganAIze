import { describe, expect, it } from "vitest";
import type { FetchLike } from "../gemini/gemini-llm-client";
import { createLlmClientFromEnv } from "./llm-client-from-env";

const unusedFetcher: FetchLike = async () => {
  throw new Error("fetch should not be called");
};

describe("createLlmClientFromEnv", () => {
  it("refuses to build a client when the key is missing", () => {
    expect(createLlmClientFromEnv({ LLM_MODEL: "model-x" }, unusedFetcher)).toEqual({
      ok: false,
      reason: "LLM_API_KEY is not set",
    });
  });

  it("builds a client that calls the configured model", async () => {
    const urls: string[] = [];
    const fetcher: FetchLike = async (url) => {
      urls.push(url);
      return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: "{}" }] } }] }), text: async () => "" };
    };

    const outcome = createLlmClientFromEnv({ LLM_API_KEY: "key", LLM_MODEL: "model-x" }, fetcher);

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(await outcome.llm.generateJson("prompt")).toEqual({ ok: true, json: {} });
    expect(urls).toEqual([
      "https://generativelanguage.googleapis.com/v1beta/models/model-x:generateContent",
    ]);
  });

  it("builds a local Ollama client without a key when the provider is ollama", async () => {
    const urls: string[] = [];
    const fetcher: FetchLike = async (url) => {
      urls.push(url);
      return { ok: true, status: 200, json: async () => ({}), text: async () => JSON.stringify({ message: { content: "{}" }, done: true }) };
    };

    const outcome = createLlmClientFromEnv({ LLM_PROVIDER: "ollama", LLM_MODEL: "qwen3:4b-instruct" }, fetcher);

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(await outcome.llm.generateJson("prompt")).toEqual({ ok: true, json: {}, totalTokens: 0 });
    expect(urls).toEqual(["http://127.0.0.1:11434/api/chat"]);
  });
});
