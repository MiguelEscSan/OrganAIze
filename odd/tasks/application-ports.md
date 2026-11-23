# Feature: application-ports

## Objective

Phase 1 of `docs/plan.md`: ports and use cases for the whole board, organized with CQRS and a mediator, each use case with its own tests running on in-memory adapters.

## Scope

- Request commands: create, edit, delete. Request queries: list, get.
- Task commands: move (user), claim next ready, submit develop result, submit test result (pass or reject), stop for budget, review decision.
- Board query: tasks grouped by status.
- Ports: request repository, task repository, event log, id generator, clock.
- Mediator that routes commands and queries to their handlers.
- In-memory adapters for every port.

## Out of scope

- Database adapters (phase 2).
- Orchestrator, Develop and Testing agents (phase 3 onward).

## Rules applied

- A request can be edited only while all its tasks are in definition.
- A request can be deleted only while all its tasks are in definition or review.
- Every task transition writes a `TaskEvent` to the event log. Creation is not a transition and writes no event.
- A budget stop writes an event from in_progress to review, actor system.
- At most one task in progress: claim and continue both check it.

## Tasks

- [ ] T1 Ports and in-memory adapters
- [ ] T2 Mediator (CQRS: commands and queries)
- [ ] T3 Request use cases with tests
- [ ] T4 Task use cases with tests
- [ ] T5 Board query and handler registration
- [ ] T6 Full checks: test, tsc, lint, build

## Route

Inline. Each task is written with its test first where behavior is deterministic.
