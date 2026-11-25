# Feature: Type-check in Testing

## Objective
Testing rejects a subtask whose files do not resolve against the rest of the project (missing relative modules, missing exports, unknown names), with concrete numbered feedback, before the LLM review runs.

## Problem
In a real run (weather app) Testing approved an `App.tsx` that failed `tsc` with 3 errors: it imported `./weatherService` while the file is `src/weatherService.ts`, and used the non-existent `Position` and `PositionError` types. Testing's deterministic checks only parse each file for syntax, so "Deploy" did not guarantee a project that compiles.

## Decisions
- A new `ProjectTypeChecker` port in `src/ports`, implemented by an adapter that uses the TypeScript compiler API over an in-memory file set (the project files plus the real TypeScript default libs, including DOM). Domain and application stay free of I/O.
- It runs inside `runTesting` after the existing deterministic checks pass and before the LLM review. Any failure goes back to Develop as numbered feedback and counts as a failed attempt, like the other deterministic failures.
- Only diagnostics located in the subtask's own files are reported; errors in other subtasks' files belong to those subtasks.
- The project has no `node_modules`, so package typings (react and others) are unavailable. The checker keeps precision over recall: it reports only diagnostic codes that point to a real mistake without package typings (unresolved relative imports, missing exported members, unknown names, wrong argument counts, property or type mismatches among local files) and drops every diagnostic that only exists because a package is not installed.
- Resolution of relative imports follows the usual rules (`.ts`, `.tsx`, `index.ts`, `index.tsx`).

## Scope
- Port, TypeScript adapter, in-memory twin.
- `runTesting` wiring and the feedback format (same numbered style: criterion `Type check`, file and line).
- Tests of the adapter against the real compiler, using the weather app mistakes as fixtures.

## Out of scope
Installing dependencies, running `npm run build`, linting, type-checking non-TS files, changing the LLM review prompt, the noisy "criterion satisfied" feedback.

## Acceptance criteria
1. A relative import that does not resolve fails with the file and line.
2. A named import that the target file does not export fails with the file and line.
3. A use of an unknown name or type (for example `PositionError`) fails with the file and line.
4. A correct React and TypeScript file that imports `react` does not fail only because `react` is not installed.
5. Errors located in files that are not part of the subtask are not reported against it.
6. A failed type-check sends the task back to In progress with numbered feedback and adds one attempt; the LLM review does not run.
7. A project that type-checks cleanly continues to the LLM review as before.

## Route
- T1 Port, in-memory twin and `runTesting` wiring (RED first).
- T2 TypeScript adapter against the real compiler (RED first).
- T3 Verification: test, tsc, lint, build, and a check on the real weather project files.

## Progress
- [x] T1 Port, twin and runTesting wiring. RED: 2 of 5 new run-testing tests failed before wiring; GREEN after. Type failures become numbered `Type check (file:line): message` feedback; listing or checker errors fall through to the LLM review. Dependencies are optional in `TestingDependencies` (required in `createMediator`) because `claim-and-orchestrate-request.ts` types its deps as `DevelopDependencies`.
- [x] T2 TypeScript adapter. RED: suite failed on the missing module; GREEN with 10 real-compiler tests (weather fixtures, React component with uninstalled packages produces no failures, own-files-only). In-memory CompilerHost, real default libs read from the typescript package, allowlist of codes 2307 (relative code imports only), 2304, 2305, 2614, 2552, 2551, 2554, 2555, 2322, 2345, 2339.
- [x] T3 Verification: vitest 69 files / 373 tests, tsc exit 0, lint exit 0 and build pass. The checker run on the real weather project files reports exactly the 3 errors `tsc` found in App.tsx (unresolved `./weatherService` at line 16, unknown `Position` at line 50, unknown `PositionError` at line 70) and nothing for `src/WeatherDisplay.tsx` and `src/weatherService.ts`. Not verified: a full live run where Testing rejects the subtask and Develop fixes it after the feedback.

## Findings
- `projectFiles` and `typeChecker` are optional in `TestingDependencies` because `claim-and-orchestrate-request.ts` types its dependencies as `DevelopDependencies`. The mediator always supplies both, so the real flow type-checks, but a direct caller can skip the check silently. Making them required means threading them through `src/application/tasks/**`.

## Next step
None for this feature. Optional follow-up: make the type-check dependencies required everywhere.
