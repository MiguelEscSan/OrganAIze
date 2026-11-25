# Subtask live status

## Objective

Each task card on the board shows what its agent is doing right now, so two subtasks running at once are told apart.

## Problem

`agent_activity` keeps one row per agent (primary key `agent`). Develop shows only the last subtask it wrote, and nothing shows which subtask is in progress.

## Decision

Store the live status on the task row (`tasks.live_status`), not in the per-agent row. The decorator writes the character count there while the model streams, and clears it when the agent finishes.

## Scope

- Domain: optional `liveStatus` on `Task`.
- Port: `TaskRepository.setLiveStatus(taskId, liveStatus | null)`.
- Adapters: Drizzle repository and schema, migration `0009`, in-memory repository.
- Application: `streamedActivityLlm` reports through a generic callback; develop and testing write the task's live status; the orchestrator keeps writing the agent row.
- Presentation: task card shows the live status line.

## Out of scope

- Full history of activity (kept as a later option).
- Merge agent calls.

## Acceptance criteria

- While a subtask is written, its card shows `Writing · N characters`, updated every 500 characters.
- When the agent finishes, the live status is cleared.
- Two subtasks running in parallel each show their own status.

## Checks

- `vitest run`, `tsc --noEmit`, `eslint src`.
- Migration applied to Supabase and the column present.

## Tasks

- [ ] T1 Domain and port: `liveStatus` and `setLiveStatus`.
- [ ] T2 Decorator reports through a generic callback (RED first).
- [ ] T3 Develop and testing write and clear the task's live status (RED first).
- [ ] T4 Drizzle column, migration 0009, in-memory repository.
- [ ] T5 Task card shows the live status.
- [ ] T6 Verify and commit.

## Route

Inline. Each task touches at most three files.

## Progress

Started.
