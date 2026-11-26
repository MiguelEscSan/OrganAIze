# Feature: Actionable feedback for Develop

## Objective
When Testing or the scope check rejects Develop's output, the feedback tells the model how to fix it, so a small local model does not repeat the same mistake until it runs out of attempts.

## Problem
In a live run on `qwen3:4b-instruct` two subtasks ended in Review after three attempts with the same error:
- `Type check (src/WeatherDisplay.tsx:1): Unresolved relative import: Cannot find module '../weatherService'`. The file exists as `src/weatherService.ts`, but nothing tells the model the right path.
- `Develop wrote outside its file scope: src/App.tsx`. The allowed file was `App.tsx`; the feedback does not name it.

## Decisions
- Type check: when a relative import does not resolve and the project has a file with the same base name (extension ignored, `index` files count as their folder name), the message adds `Did you mean './src/weatherService'?` with the specifier written relative to the importing file, without extension. If several files match, list up to three. If none match, the message stays as it is.
- Scope check: the feedback lists the files Develop may write (`Allowed files: App.tsx`). When a rejected path has the same base name as an allowed file, it adds `Did you mean 'App.tsx'?`.
- Everything stays deterministic and free of LLM calls.

## Scope
- TypeScript project type-checker adapter: suggestion for unresolved relative imports.
- Develop file-scope rejection message (domain `checkFileScope` and the way `runDevelop` turns it into feedback).

## Out of scope
Suggestions for missing exports or unknown names, changing the Develop prompt, raising the attempt limit, changing the model.

## Acceptance criteria
1. An import `./weatherService` from `App.tsx` when only `src/weatherService.ts` exists reports `Did you mean './src/weatherService'?`.
2. An import `../weatherService` from `src/WeatherDisplay.tsx` when `src/weatherService.ts` exists reports `Did you mean './weatherService'?`.
3. When several files share the base name, up to three suggestions are listed.
4. When no file matches, the message has no suggestion.
5. A write to `src/App.tsx` when only `App.tsx` is allowed fails with `Allowed files: App.tsx` and `Did you mean 'App.tsx'?`.
6. A write to a path with no matching base name lists the allowed files without a suggestion.
7. The existing rejections (absolute paths, `..`, misnamed entry, empty write set) keep working.

## Route
- T1 Type-check suggestion (RED first, real compiler).
- T2 Scope-check message (RED first).
- T3 Verification: test, tsc, lint, build, and the real weather files.

## Progress
- [x] T1 Type-check suggestion (RED: 5 new real-compiler tests failed; GREEN: full suite 426 passed; `suggest-import-path.ts` plus wiring in the checker)
- [x] T2 Scope-check message (RED: 3 new and 2 updated tests failed; GREEN with the pure `checkFileScope` returning the full reason)
- [ ] T3 Verification

## Next step
T1 and T2 with one bounded writer, then T3.
