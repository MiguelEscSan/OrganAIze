# Board UX redesign

Branch: `feat/board-ux-redesign`
Design reference: Artifact canvas https://claude.ai/artifact/RebNTuXnZfy3We8ctM9uzA (artboards Main, Card-Detail, Card-Edit, Card-Agent-States).

## Objective

Make the board easier to read and act on: clear navigation, subtasks that visibly hang from their parent request, and agent activity shown on the card.

## Authorized scope

- `src/presentation/**` (shell, projects, board), `src/app/projects/[id]/layout.tsx`, `src/app/globals.css`.
- One pure helper in `src/domain/tasks/` for grouping a column into request families, with Vitest tests.
- No change to domain rules, ports, adapters, API routes or DB schema.
- Out of scope: new agent telemetry (structured steps, log stream, time and token budgets on the card). Only `task.liveStatus` and existing Task fields are used.

## Constraints

- All code, UI copy and test names in English. No comments in code. TypeScript strict, no `any`.
- Container / presentational split. Presentational components take props only.
- Touch targets at least 44px. Text contrast 4.5:1. State never conveyed by color alone.
- Conventional Commits, no AI attribution, no push.

## Delivery

Forecast about 700 authored changed lines. Strategy: `ask-on-risk`. Each task closes with its own work-unit commit; the user decides push and PR slicing.

## Tasks

- [x] T1 Navigation: active link state (client `NavLinks` with icons) and a breadcrumb in the project layout header. Route: delegated writer. Commit d7da930.
- [x] T2 Request families: pure `groupColumnIntoFamilies` in domain with tests (RED first), then column rendering where subtasks hang from the parent card with connector lines, and a ghost parent head in columns where only children live. Route: delegated writer. Commit dba97e0.
- [x] T3 Card redesign: agent activity block colored per agent (Develop, Testing), attempt dots, one primary action plus overflow menu, parent card with progress segments, column headers with hints, promoted New request button. Route: delegated writer. Commits 79f3c5d (cards), 6e950b0 (columns and toolbar).
- [x] T4 Dialogs: restyle task details (parent block with sibling list, agent status panel from existing fields) and the edit dialog (Save and move to Ready). Route: delegated writer. Commits 9326a67 (details dialog and `listFamilySiblings`), 6422b22 (request dialog).

## Acceptance criteria

- The current page is marked with `aria-current="page"` in the main nav and has a visible active style.
- In a column, children of the same parent are visually grouped under their parent (full card in its own column, ghost head elsewhere).
- Standalone requests render exactly as before in Definition and Ready.
- `npm test`, `npm run lint` and `npx tsc --noEmit` pass.

## Progress

Exploration done (nav, project routes, board data flow mapped). Parent request task lives in `in_progress` with `parentTaskId === null`; subtasks carry `parentTaskId`.

T3 deliberately skipped: waiting state and unreachable-model state (no Task field carries either, only `liveStatus` text), elapsed time on the activity block (no timestamp field), QA slot count, page-level attention banner and agent strip (outside the T3 spec and needing new data). Subtask drag restored to `isUserEditable` after the T2 regression.

T4 deliberately skipped: time and token budgets and elapsed time in the agent panel (no data), a separate `aria-labelledby` wiring for the Description editor (the rich text editor already labels itself, and its file is outside the T4 surface). Combined "Save and move to Ready" awaits the edit before moving, via `onEdit` typed as `void | Promise<void>`. `npm run build` failed at prerender of `/projects/[id]` because `usePathname()` in `nav-links.tsx` (T1) sat outside a Suspense boundary. Fixed afterwards: `AppShell` wraps `NavLinks` in `Suspense` with a static `NavLinksView` fallback; `tsc`, lint and build pass.

## Next step

Visual check in the browser and PR slicing (user decision).
