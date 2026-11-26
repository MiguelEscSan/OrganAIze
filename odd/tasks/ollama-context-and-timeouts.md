# Feature: Ollama context window and timeouts

## Objective
With the local Ollama provider, the prompts fit the model's context window and a slow local model is not cut off by Node's default fetch timeouts.

## Problem
In a live run against `qwen3:4b-instruct` (Ollama, context 8192 tokens, partly on CPU):
- The Develop prompt carries up to 30,000 characters of read-only project context (the `defaultContextBudget` of `select-context-files`), about 7,500 tokens or more, so with the rest of the prompt it can overflow the 8192-token window. Ollama then truncates the prompt and the model degrades.
- A request was aborted at 5m4s: Ollama logged "aborting chat request due to client closing the connection" and returned 500. This matches Node's default undici timeouts (300 s for headers and body) on `fetch(url, init)` in `app-services.ts`. Not proven, consistent with the timing.
- The documentation still says Gemini although the running provider is Ollama.

## Decisions
- The LLM client declares its context window in tokens (optional). Develop derives the read-only context budget from it: one character per token of window (a quarter of the window in tokens at about four characters per token), capped by the existing default of 30,000 characters. A client that does not declare a window keeps the default.
- The Ollama window comes from `OLLAMA_NUM_CTX` (default 8192) and is sent as `num_ctx`.
- Ollama requests use a dispatcher with `headersTimeout` and `bodyTimeout` disabled (the `undici` package), so a slow local model is never cut off by the client. Time and token budgets in Settings remain the only limits.
- Gemini behaviour is unchanged.

## Scope
- `LlmClient` port: optional `contextWindowTokens`.
- Ollama adapter and env config: `OLLAMA_NUM_CTX`, `num_ctx` from config, undici dispatcher without timeouts.
- `runDevelop`: context budget from the client's window.
- README: provider section (Ollama local and Gemini) and the variables `LLM_PROVIDER`, `LLM_MODEL`, `OLLAMA_BASE_URL`, `OLLAMA_NUM_CTX`, `LLM_API_KEY`.

## Out of scope
Changing the model, summarizing or ranking context files, the Testing review prompt size, `.env.example`.

## Acceptance criteria
1. With a client that declares a window of 8192 tokens, the context passed to Develop is at most 8192 characters.
2. With a client that declares no window, the budget stays 30,000 characters.
3. A larger declared window never raises the budget above 30,000 characters.
4. The Ollama request body carries `num_ctx` equal to the configured value, 8192 when `OLLAMA_NUM_CTX` is not set; an invalid value falls back to 8192.
5. The Ollama requests are sent with a dispatcher that has no headers or body timeout.
6. The README describes the Ollama provider and its variables.

## Route
- T1 Port, Ollama config and adapter (RED first).
- T2 Develop context budget from the client window (RED first).
- T3 README and verification, including a request against the real local Ollama.

## Progress
- [x] T1 Port, Ollama config and adapter (RED observed: 12 failing tests; GREEN: full suite passes; undici added)
- [x] T2 Develop context budget (RED observed; `streamedLlm` now forwards `contextWindowTokens` so the budget reaches `runDevelop`)
- [ ] T3 README and verification (README done; real Ollama check pending)

## Next step
T3: request against the real local Ollama.
