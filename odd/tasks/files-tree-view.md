# Files tree view

Branch: `feat/files-tree-view`

## Objective

In the project Files tab, show files as a collapsible folder tree instead of a flat list of full paths such as `components/App.tsx`.

## Authorized scope

- `src/presentation/project-files/` only: a pure tree builder with tests, a tree component, and wiring in `files-browser.tsx`.
- No change to ports, adapters, API routes or the polling hook.

## Constraints

- English code and UI copy, no comments in code, TypeScript strict, no `any`.
- Presentational components take props only. Touch targets at least 44px, real buttons, `aria-expanded` on folders, `aria-current` on the selected file.
- Conventional Commits, no AI attribution, no push.

## Tasks

- [x] T1 Pure `buildFileTree(paths)` with tests written first: nested folders, folders before files, case-insensitive alphabetical order, root-level files, empty input. Route: delegated writer. Commit 9d677fe.
- [x] T2 `FileTree` component and wiring in `FilesBrowser`: folders collapsible and expanded by default, ancestors of the selected file always visible, indentation by depth, folder and file icons, selected file highlighted. Route: delegated writer. Commit e9276a0.

## Acceptance criteria

- Files appear grouped under their folders, with only the file name shown.
- Clicking a folder toggles it; clicking a file shows its content as before.
- Polling updates keep the selected file and the collapsed state when the file still exists.
- `npm test`, `npx tsc --noEmit`, `npm run lint` and `npm run build` pass.

## Progress

Current component: `files-browser.tsx` renders a flat `<ul>` with `file.path` as the label.

## Next step

Visual check and PR (user decision).
