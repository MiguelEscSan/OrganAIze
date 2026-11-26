import { describe, expect, it } from "vitest";
import type { OllamaFetch } from "../ollama/ollama-llm-client";
import { createLlmClientFromEnv } from "./llm-client-from-env";

const unusedFetcher: OllamaFetch = async () => {
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
    const fetcher: OllamaFetch = async (url) => {
      urls.push(url);
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "{}" }] } }] }));
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
    const fetcher: OllamaFetch = async (url) => {
      urls.push(url);
      return new Response(JSON.stringify({ message: { content: "{}" }, done: true }));
    };

    const outcome = createLlmClientFromEnv({ LLM_PROVIDER: "ollama", LLM_MODEL: "qwen3:4b-instruct" }, fetcher);

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(await outcome.llm.generateJson("prompt")).toEqual({ ok: true, json: {}, totalTokens: 0 });
    expect(urls).toEqual(["http://127.0.0.1:11434/api/chat"]);
  });

  describe("ollama context window", () => {
    const windowOf = (extra: Record<string, string>) => {
      const outcome = createLlmClientFromEnv(
        { LLM_PROVIDER: "ollama", LLM_MODEL: "qwen3:4b-instruct", ...extra },
        unusedFetcher,
      );

      return outcome.ok ? outcome.llm.contextWindowTokens : undefined;
    };

    it("uses OLLAMA_NUM_CTX when it is a positive integer", () => {
      expect(windowOf({ OLLAMA_NUM_CTX: "16384" })).toBe(16384);
    });

    it("defaults to 8192 when OLLAMA_NUM_CTX is not set", () => {
      expect(windowOf({})).toBe(8192);
    });

    it.each(["abc", "0", "-5", "4096.5", ""])("falls back to 8192 when OLLAMA_NUM_CTX is %j", (value) => {
      expect(windowOf({ OLLAMA_NUM_CTX: value })).toBe(8192);
    });

    it("sends the configured window as num_ctx in the request", async () => {
      const bodies: string[] = [];
      const fetcher: OllamaFetch = async (_url, init) => {
        bodies.push(init.body);
        return new Response(JSON.stringify({ message: { content: "{}" }, done: true }));
      };
      const outcome = createLlmClientFromEnv(
        { LLM_PROVIDER: "ollama", LLM_MODEL: "m", OLLAMA_NUM_CTX: "2048" },
        fetcher,
      );

      if (!outcome.ok) throw new Error(outcome.reason);
      await outcome.llm.generateJson("prompt");

      expect(JSON.parse(bodies[0]).options).toEqual({ num_ctx: 2048 });
    });
  });

  it("does not declare a context window for Gemini", () => {
    const outcome = createLlmClientFromEnv({ LLM_API_KEY: "key", LLM_MODEL: "model-x" }, unusedFetcher);

    expect(outcome.ok && outcome.llm.contextWindowTokens).toBeUndefined();
  });
});
