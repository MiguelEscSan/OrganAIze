# Feature: Project context for Develop

## Objective
Develop sees the rest of the project, not only the files of its own subtask, so a subtask that wires pieces together uses the real files that already exist instead of inventing its own.

## Problem
A real run (weather app, 4 subtasks) ended with the integration subtask in Review. `developPrompt` in `run-develop.ts` only passes the current content of `task.files`. The integration subtask could not see `weatherService.ts` or `WeatherDisplay.tsx`, wrote a mock service inside `App.tsx` instead, and failed Testing three times on syntax errors.

## Decisions
- Pass the other project files as read-only context, read through the existing `ProjectFiles` port, never through a new port.
- A pure domain rule selects the context: every project file except the subtask's own files and scaffold-only files (package.json, tsconfig.json, vite.config.ts, index.html, main.tsx), in alphabetical order, until a character budget is reached. Files that do not fit are skipped, never truncated.
- Also tell Develop which sibling subtasks of the same request exist (title and declared files), so it can refer to files that are not written yet.
- The write scope does not change: Develop may still write only `task.files`, and the scope check stays as is.
- Subtasks of a request still run in parallel, so context files may not exist yet when a subtask starts. Making a subtask wait for the ones it depends on belongs to `task-dependencies.md`, not to this feature.

## Scope
- Domain: pure `selectContextFiles` with a character budget.
- Application: `runDevelop` reads the project files and builds the prompt with a read-only context section and a sibling subtasks section.
- Wiring of the `ProjectFiles` dependency in the Develop use case and its tests.

## Out of scope
Task dependencies and ordering, Testing feedback that lists satisfied criteria, changing the Gemini model, truncating files.

## Acceptance criteria
1. The Develop prompt contains the content of existing project files that are not part of the subtask, marked read-only.
2. The subtask's own files are not repeated in the context section.
3. Scaffold-only files are never in the context.
4. When the budget is reached, remaining files are skipped whole and the prompt stays under the budget.
5. The prompt lists the sibling subtasks of the same request with their declared files.
6. Develop still rejects writes outside `task.files`.
7. A project with no other files works as before.

## Route
- T1 Domain: `selectContextFiles` (RED first).
- T2 Application: context and sibling sections in the Develop prompt (RED first, in-memory adapters).
- T3 Verification: test, tsc, lint, build, and a real rerun of the weather request.

## Progress
- [x] T1 Domain context selection (RED: module missing; GREEN: 7 tests in select-context-files.test.ts)
- [ ] T2 Develop prompt with project context
- [ ] T3 Verification

## Next step
T1 and T2 with one bounded writer, then T3.
