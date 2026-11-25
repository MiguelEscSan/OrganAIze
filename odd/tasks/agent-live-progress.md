# Agent live progress

## Objective

Show on the team panel what each agent is doing while its model reply is still being generated.

## Problem

The Ollama adapter already streams replies, but the application only records "working" once at the start and "idle" at the end. The team panel stays on the same message for minutes.

## Scope

- `src/ports/llm-client.ts`: optional progress listener on `generateJson`.
- `src/adapters/ollama/ollama-llm-client.ts`: read the response body incrementally and report characters received.
- `src/application/agents/streamed-activity-llm.ts`: decorator that records throttled progress in the agent activity.
- Call sites in `run-develop.ts`, `orchestrate-request.ts`, `run-testing.ts` wrap their LLM client with the decorator.

## Out of scope

- Merge agent calls (`merge-shared-file.ts`).
- Gemini adapter (ignores progress, still works).
- Token-level progress: Ollama only reports token counts at the end.

## Acceptance criteria

- The Ollama client calls the listener with the cumulative characters, only when the content grows.
- The decorator records a working activity whose message carries the character count, at most once per 500-character step.
- Existing behavior and tests keep passing.

## Checks

- `vitest run`, `tsc --noEmit`, `eslint`.

## Tasks

- [x] T1 Port: optional progress listener on `LlmClient.generateJson`.
- [x] T2 Ollama adapter: incremental body reading with progress (RED observed: progress test failed on an empty list).
- [x] T3 Application decorator `streamedActivityLlm` with throttled recording (RED: module missing before implementation).
- [x] T4 Wire the decorator into develop, orchestrate and testing.
- [x] T5 Verify: 304/304 tests, `tsc --noEmit` clean, `eslint src` clean. Production build not rerun yet.

## Route

Delegated direct is not needed: each task touches at most two files. Inline route for all tasks.

## Progress

Done. The team panel already shows `AgentActivityRecord.message` and polls it, so no UI change was needed. Next step: rebuild with `npm run build`, restart the production server, and watch a real run on `/team`.
