import { describe, expect, it } from "vitest";
import { readLlmConfig } from "./llm-config";

describe("readLlmConfig", () => {
  it("reads the key and model from the environment", () => {
    expect(readLlmConfig({ LLM_API_KEY: " key ", LLM_MODEL: "model-x" })).toEqual({
      ok: true,
      config: { apiKey: "key", model: "model-x" },
    });
  });

  it("refuses a missing key", () => {
    expect(readLlmConfig({ LLM_MODEL: "model-x" })).toEqual({ ok: false, reason: "LLM_API_KEY is not set" });
  });

  it("refuses a missing model", () => {
    expect(readLlmConfig({ LLM_API_KEY: "key" })).toEqual({ ok: false, reason: "LLM_MODEL is not set" });
  });
});
