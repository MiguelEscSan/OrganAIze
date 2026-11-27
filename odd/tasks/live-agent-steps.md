# Feature: live agent steps

Branch: `feat/live-agent-steps`

## Objective

While an agent runs, the board card and the Team panel show the concrete step it is on, for example "Reading Footer.tsx", "Writing Footer.tsx", "Type-checking Footer.tsx", "Reviewing criteria against Footer.tsx".

## Problem

- The card status is written only every 500 streamed characters, and only the Ollama adapter streams. With Gemini (`generateContent`, no streaming) the card never shows activity.
- Even when it shows, it reads "Writing · 1,000 characters", which says nothing about what the agent touches.
- Team shows a single message set at the start and cleared at the end.

## Why

Everything the agents do must be visible on the board (Agent principle 8, Observable). Steps are announced by the application layer, so they work with any `LlmClient`.

## Scope

- `src/application/agents/live-progress.ts`: a step reporter with `announce(step)` and a streamed-characters report that appends to the current step.
- Announce steps in `run-develop.ts`, `run-testing.ts`, `run-request-qa.ts`, `orchestrate-request.ts`.
- No change to ports, domain, adapters, or the Gemini client.
- Presentation: only if a step does not already render on the card or in Team.

## Constraints

- English identifiers and UI copy, no comments in code.
- Steps name files by path, never file contents or secrets.
- Step text is plain sentences, no new dependency.
- Tests first, in-memory adapters.

## Tasks

- [x] T1 Step reporter in `live-progress.ts` with tests (RED first)
- [x] T2 Develop announces: reading files, reading project context, waiting for the model to write files, checking scope, merging shared files, saving files
- [x] T3 Testing announces: reading files, running file checks, type-checking, reviewing criteria; same for request-level QA
- [x] T4 Orchestrator announces: splitting into subtasks, writing the scaffold
- [x] T5 Presentation: steps render on each subtask card and on the request card ("Develop on N"); no presentation change needed
- [x] T6 Verify live in the browser with a real run

## Acceptance criteria

1. With a non-streaming `LlmClient`, a Develop run publishes at least one step before the model call and clears the status afterwards.
2. Steps name the files involved.
3. A Testing run publishes steps for file checks, type-check and criteria review.
4. Streamed characters, when present, append to the current step instead of replacing it.
5. Status is cleared when the run ends, including on failure.

## Progress

Branched from `refactor/agent-prompts-in-markdown` because the prompt library it depends on is not in `main` yet.

T1 to T4 done, not committed yet. RED observed first: 18 failing tests (missing `describe-paths` module, `liveStepsOf` not a function, steps not announced). GREEN: `npx vitest run` 95 files passed and 1 skipped, 632 tests passed and 5 skipped; `npx tsc --noEmit` exit 0.

Step wording: Develop `Reading <paths>`, `Reading project context`, `Writing <paths>`, `Checking file scope`, `Merging <path> with changes from other subtasks`, `Saving <paths>`. Testing `Reading <paths>`, `Running file checks`, `Type-checking <paths>`, `Reviewing the criteria against <paths>`. Request QA `Opening the running app`, `Reviewing the request criteria against the running app`. Orchestrator `Writing the project scaffold`, `Splitting "<title>" into subtasks`. Streamed characters append as `<step> · N characters`.

T5 and T6 done. Production build, request with 4 subtasks, observer sampling the board every 250 ms. Observed on cards: "Writing the project scaffold", "Splitting ... into subtasks", "Develop on 3", "Writing Header.tsx", "Reading project context", "Checking file scope", "Writing Badge.tsx", "Type-checking Footer.tsx", "Reviewing the criteria against Badge.tsx". Subtasks ran in parallel and each card showed its own step.

Open, not fixed: Team keeps one record per agent and `withAgentActivity` sets it to idle when any run ends, so with parallel Develop runs Team can show Idle while others still work (from code reading, not observed). Testing once rejected Header.tsx with "Invalid input: expected object, received array" (reply format), unrelated to this feature.

## Route

T1 to T4: one delegated writer (more than two non-trivial files). T5 to T6: parent.
