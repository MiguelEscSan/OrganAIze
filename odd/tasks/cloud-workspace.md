# Feature: Cloud workspace

## Objective
Let a project keep its files in Supabase Storage instead of a physical folder, chosen per project: with a folder path the project lives on disk, without one it lives in Storage.

## Decisions (from the user)
- Files go to Supabase Storage (a bucket), not a Postgres table.
- The mode is per project: a project with a `rootPath` uses disk, a project without one uses Storage.

## Constraints
- `domain` and `application` stay free of Supabase. The adapter sits behind the existing ports (`WorkspaceWriter`, `ProjectFiles`).
- Adding `@supabase/supabase-js` is scoped to Storage only; `docs/architecture.md` must say so.
- Adapter tests never run against Supabase. Storage logic is tested against a fake bucket port; the real bucket is verified by hand.
- Secrets only from env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`.

## Design
- A workspace location is a string: the disk path when the board has a `rootPath`, otherwise `storage:<boardId>`.
- The composition root routes `workspaceFor(location)` and `projectFiles.list(location)` by that prefix.
- `rootPath` becomes optional on the board (nullable column, form field optional).
- Playwright needs real files: for a Storage location it downloads to a temp dir, runs, cleans up. It stays behind `browserCheckEnabled` where the host cannot run it.
- `ProjectTypeChecker` and `ArchiveWriter` already take in-memory files: no change.

## Tasks
- [x] T1 Board location model: optional `rootPath`, `workspaceLocationOf(board)`, migration, in-memory parity (RED first). Verified: 522 tests pass, tsc clean, drizzle tests ran on Docker Postgres. Route: delegated writer. Migration 0011 snapshot and journal were written by hand, not by drizzle-kit.
- [x] T2 Supabase Storage adapter: workspace writer and project files with the disk ignore list and size filters, against a fake bucket. Verified: 531 tests pass, tsc clean. Not tested: the real bucket client (listing recursion, pagination) needs a manual check. Route: delegated writer.
- [x] T3 Routing by location in the composition root, `rootPathOfTask` and consumers use the location. Verified: 539 tests pass, tsc clean, no remaining `board.rootPath` use reaches files. `app-services.ts` wiring itself is only covered by the factory unit tests. Route: delegated writer.
- [x] T4 Playwright probe for Storage locations (materialize, inspect, clean up). Verified: 545 tests pass, tsc clean. Route: delegated writer.
- [x] T5 Project form with optional folder, docs. Done inline (mechanical). `.env.example` NOT updated: reads of env files are denied in this session, so the user adds the three Supabase variables with empty values.

- [x] T6 (verified: stack healthy, 5 integration cases pass against the real gateway, tsc clean; gateway is on port 54600 because Windows reserves 54268-54467) Local Storage in Docker: storage-api + own Postgres + nginx exposing /storage/v1 in docker-compose.yml, local-only keys, integration test of the real object store against it, docs for the local env values. Ports must avoid the unrelated FitnessCRM Supabase stack (54321-54324) and the app Postgres (5432).

## Route per task
Delegated direct writer for every task (2+ non-trivial files each); parent reviews the diff and runs the suite.

## Acceptance criteria
1. A board created without a folder is scaffolded into Storage under its id and appears in Files, Preview and Download.
2. A board created with a folder behaves exactly as today.
3. Develop, Testing and the type checker work against a Storage project.
4. No Supabase import in `domain` or `application`.
5. The full test suite passes; the live test runs on Storage.

## Progress
Branch `feat/cloud-workspace`, created from main. Nothing implemented yet. The Engram mirror `odd/cloud-workspace/tasks` is pending: the save failed with a host session registration error.

## Next step
T1 with a failing test first.
