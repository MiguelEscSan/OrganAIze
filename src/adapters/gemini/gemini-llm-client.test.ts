import { describe, expect, it } from "vitest";
import { createGeminiLlmClient, type FetchLike } from "./gemini-llm-client";

const config = { apiKey: "test-key", model: "test-model" };

const jsonResponse = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  text: async () => JSON.stringify(body),
});

const candidateWithText = (text: string) => ({
  candidates: [{ content: { parts: [{ text }] } }],
});

describe("createGeminiLlmClient", () => {
  it("sends the key in a header and the model in the path", async () => {
    const calls: { url: string; headers: Record<string, string> }[] = [];
    const fetcher: FetchLike = async (url, init) => {
      calls.push({ url, headers: init.headers });
      return jsonResponse(200, candidateWithText("{}"));
    };

    await createGeminiLlmClient(config, fetcher).generateJson("prompt");

    expect(calls[0].url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/test-model:generateContent",
    );
    expect(calls[0].headers["x-goog-api-key"]).toBe("test-key");
  });

  it("returns the parsed JSON from the candidate text", async () => {
    const fetcher: FetchLike = async () => jsonResponse(200, candidateWithText('{"subtasks":[]}'));

    const reply = await createGeminiLlmClient(config, fetcher).generateJson("prompt");

    expect(reply).toEqual({ ok: true, json: { subtasks: [] } });
  });

  it("reports an HTTP failure without leaking the key", async () => {
    const fetcher: FetchLike = async () => jsonResponse(429, {});

    const reply = await createGeminiLlmClient(config, fetcher).generateJson("prompt");

    expect(reply).toEqual({ ok: false, reason: "Gemini request failed with status 429" });
  });

  it("reports the total tokens Gemini counted for the call", async () => {
    const fetcher: FetchLike = async () =>
      jsonResponse(200, { ...candidateWithText("{}"), usageMetadata: { totalTokenCount: 321 } });

    const reply = await createGeminiLlmClient(config, fetcher).generateJson("prompt");

    expect(reply).toEqual({ ok: true, json: {}, totalTokens: 321 });
  });

  it("reports a reply that is not JSON", async () => {
    const fetcher: FetchLike = async () => jsonResponse(200, candidateWithText("Sure, here is a plan"));

    const reply = await createGeminiLlmClient(config, fetcher).generateJson("prompt");

    expect(reply).toEqual({ ok: false, reason: "Gemini reply is not valid JSON" });
  });

  it("reports a reply with no candidate text", async () => {
    const fetcher: FetchLike = async () => jsonResponse(200, { candidates: [] });

    const reply = await createGeminiLlmClient(config, fetcher).generateJson("prompt");

    expect(reply).toEqual({ ok: false, reason: "Gemini reply has no text" });
  });
});
