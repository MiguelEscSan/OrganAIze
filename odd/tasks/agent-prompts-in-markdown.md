# Agent prompts in markdown

## Objective

The instructions of every agent live in markdown files under `prompts/`, loaded through a port, instead of strings built inside TypeScript functions. The text sent to the model stays exactly the same as today.

## Why

Prompts are the behavior of the agents. As markdown they can be read, reviewed and edited like documents, without reading the code that assembles them.

## Scope

- One markdown file per prompt: orchestrator, develop, merge, testing-subtask, testing-request.
- A `PromptLibrary` port in `src/ports`. The `application` layer never reads files.
- An adapter that reads `prompts/*.md` from disk, and the composition root wiring it.
- Templates use `{{variable}}` placeholders. Lists and optional sections are built in code and passed as variables.
- Vercel: the markdown files must be included in the serverless output (`outputFileTracingIncludes` in `next.config.ts`), or the agents would fail in production.
- Zod output schemas stay in the code.
- Out of scope: editing prompts from the app, per-project prompts, any new setting.

## Tasks

- [x] T1 Characterization tests that pin the exact prompt text for each of the five prompts with representative inputs, written and green BEFORE changing anything. Commit 3fbfa72.
- [x] T2 Port, templating, file adapter and in-memory/test wiring, with tests (missing variable and missing file fail loudly). Commit feac191.
- [x] T3 Move the five prompts to `prompts/*.md` and make the use cases render them; T1 tests stay green unchanged. Commit f6594d9.
- [x] T4 Vercel tracing in `next.config.ts` verified with a production build; docs and README pointers updated. Commit 754361c.

## Acceptance criteria

- The rendered text of every prompt is byte-identical to the one produced before the change.
- No prompt text remains in TypeScript, apart from small section labels only if they cannot be expressed as templates.
- `application` and `domain` import no filesystem module.
- A production build includes `prompts/` in the traced server output.

## Progress

All tasks done.

- T1: `src/application/agents/agent-prompts.test.ts` (11 tests) asserts the full text of the five prompts, with optional sections present and absent. Green on the unchanged code.
- T2: `PromptLibrary` port, `renderTemplate` (placeholders, `{{#name}}` sections, loud failures) and `createFilePromptLibrary` (cache, one trailing newline removed, CRLF read as LF), 16 tests.
- T3: five files in `prompts/`; the same 11 characterization tests pass with their expected text unchanged (only the call to `mergeSharedFile` changed to pass the dependencies).
- T4: `outputFileTracingIncludes` with `"/*"`. `npx next build` succeeded and every `.next/server/**/*.nft.json` of the routes and pages lists the five `prompts/*.md` files.
- Final: `npx tsc --noEmit` clean, `npx eslint src` clean, `npx vitest run` 610 passed and 5 skipped.
