# Feature: Project scaffold and download

## Objective
A project works like a normal development environment: it has the files a React app needs (package.json, tsconfig, Vite config, index.html, entry), and the user can download the whole project as a zip to run it on their own computer.

## Problem
The agents omit configuration files because nothing creates them: the Orchestrator prompt only mentions `App.tsx`, and Develop can write only the files listed in `task.files`. There is no way to download a project.

## Decisions
- Fixed template (Vite, React, TypeScript), written by the system, not planned by the Orchestrator. Deterministic and costs no tokens.
- The scaffold is written only when the project root has no `package.json`. An existing project is never touched or overwritten.
- `App.tsx` at the project root stays the entry the agents extend. The template provides a minimal `App.tsx`, so the Orchestrator no longer plans a "create App.tsx" subtask.
- The Preview tab keeps Sandpack and receives only source files; scaffold-only files (package.json, tsconfig, Vite config, index.html, main entry) are filtered out because Sandpack supplies its own.
- Download is a zip of the files the Files tab already lists (same skip rules: node_modules, .git, .next, dist, build, files over 200KB or binary). Zipping uses `fflate` (pure JS) behind an `ArchiveWriter` port.

## Scope
- Domain: pure scaffold template and the rule "which scaffold files to write for these existing paths".
- Application: `ScaffoldProject` use case (writes the template through the workspace writer), called when a project is created and before a request is orchestrated. `ArchiveProject` use case (project files to zip bytes).
- Ports and adapters: `ArchiveWriter` port, `fflate` adapter, in-memory twin.
- Orchestrator prompt: remove the hard-coded "first subtask creates App.tsx" rule; state that the scaffold already exists.
- Route `GET /api/boards/[id]/download` returning `application/zip`, and a "Download" button on the project page.
- Preview: filter scaffold-only files.

## Out of scope
Binary or large files in the zip, other frameworks or templates, installing dependencies or running the project from the app, git integration.

## Acceptance criteria
1. Creating a project whose folder has no `package.json` writes package.json, tsconfig.json, vite.config.ts, index.html, the entry file and App.tsx.
2. A project that already has a `package.json` is left untouched.
3. Running the scaffold twice never overwrites a file.
4. The Orchestrator prompt no longer asks for an App.tsx subtask.
5. Downloading a project returns a zip containing every listed project file with its path and content.
6. The Preview receives no scaffold-only files.
7. The downloaded project installs and builds on a normal machine (`npm install`, `npm run build`).

## Route
- T1 Domain: scaffold template and missing-files rule (RED first).
- T2 Application: `ScaffoldProject` and its wiring on project creation and before orchestration (RED first, in-memory adapters).
- T3 Orchestrator prompt change (RED first).
- T4 Archive: `ArchiveWriter` port, `fflate` adapter, `ArchiveProject` use case (RED first).
- T5 Route, Download button and Preview filter.
- T6 Verification: test, tsc, lint, build, and a real download that installs and builds.

## Progress
- [x] T1 Domain scaffold (scaffold template and missing-files rule, 6 tests in src/domain/projects)
- [x] T2 ScaffoldProject use case and wiring (scaffold-project, create-board and orchestrate-request tests; disk project files lists a missing folder as empty)
- [x] T3 Orchestrator prompt (prompt test asserts the scaffold exists and no App.tsx creation rule)
- [ ] T4 Archive port, adapter and use case
- [ ] T5 Route, button and Preview filter
- [ ] T6 Verification

## Next step
T4 and T5, then T6.
