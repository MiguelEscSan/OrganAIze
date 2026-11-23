# Feature: multi-board (multiple projects)

## Objective
Let the user keep several projects (boards) in the app, switch between them, and see only the tasks of the selected project.

## Problem
The board reads every task regardless of project. New requests go to the first board. Execution already uses each request's board `rootPath`.

## Decisions
- At most one request in `in_progress` stays global across all boards (existing unique index and domain rule).
- Board is selected through the URL: `/?board=<id>`. Without the parameter the first board is used.
- No new port: the application layer filters requests by `boardId`, then tasks by `requestId`.

## Scope
- `ListBoard` takes an optional `boardId` and returns only that board's tasks.
- `ListBoards` query and `GET /api/boards`, `POST /api/boards` (name + absolute path, validated by `normalizeBoardDetails`).
- `POST /api/requests` accepts `boardId`; falls back to the default board only if absent.
- `GET /api/board?boardId=` returns that board's columns.
- Page reads `searchParams.board`; `BoardContainer` receives `boardId`, passes it to `/api/board`, and shows a board selector plus a create-board form.

## Out of scope
Rename or delete of boards, per-board agent panel, per-board settings.

## Acceptance criteria
1. `listBoard` with `boardId` returns only tasks whose request belongs to that board.
2. `createRequest` stores the request under the given `boardId`.
3. `GET /api/board` without `boardId` keeps working (first board).
4. Creating a board rejects relative paths and duplicates (existing domain/DB rule).
5. The selector changes the visible tasks and the URL.

## Checks
- Vitest for application use cases (in-memory adapters).
- `npm run typecheck` and `npm run lint` (or the project equivalents) pass.
- Browser check of the selector if the dev server runs.

## Route
- Task 1: ListBoard by board (application + test, RED then GREEN).
- Task 2: CreateRequest with boardId (application + test).
- Task 3: API routes for boards and board filter.
- Task 4: Board selector and create-board form (presentation + page).

## Progress
- [x] Task 1 — ListBoard by board (3cb24c5). RED: "returns only the tasks whose request belongs to the given board" got ["t1","t2"] instead of ["t1"]. GREEN: 4/4 list-board tests.
- [x] Task 2 — CreateRequest stores boardId (1ae8415, test only). No RED: use case already stored the given boardId, so the test passes on first run.
- [x] Task 3 — API: ListBoards query, GET/POST /api/boards, boardId on /api/board and /api/requests (bdaffc4).
- [x] Task 4 — Selector, create-board form, page and container wiring (cfe594e).
- [ ] Verification: vitest 42 files / 212 tests pass; tsc exit 0; eslint clean. Browser check not run (no dev server or database in this session).

## Next step
Review the UI in the browser with a dev server and a DATABASE_URL, then decide on push and PR (user decision).
