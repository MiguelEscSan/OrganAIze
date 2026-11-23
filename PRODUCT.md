# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary users are technical evaluators who review the test deliverable, and developers who create requests and follow their progress. Both are working in a desktop browser, reading a board of tasks and checking what each agent is doing.

## Product Purpose

Agent Team is a small Next.js app where three AI agents work together on a user request. The Orchestrator splits the request into subtasks, Develop implements them one at a time, and Testing returns concrete failures until everything passes. Success means a viewer can see, at a glance, which agent is doing what and which state each task is in.

## Positioning

Unlike a generic task board, every card is driven by an agent: the assigned agent, the number of attempts, and the last piece of feedback from Testing are first-class parts of the card. The board is a live view of an agent pipeline, not a list maintained by people.

## Operating Context

- Requests enter through a single input. The Orchestrator splits them into subtasks immediately.
- Only one task is in progress at any time across the whole system; the rest wait in the Ready to develop queue in order.
- Tasks move through four columns: Ready to develop, In progress, QA, Deploy. A failed QA sends a task back to In progress with feedback attached.
- Each task allows at most three attempts before it is marked as blocked.

## Capabilities and Constraints

- Planned views: the kanban board, a projects list, a team view showing the agents on the board, and a settings section.
- Data is stored in Supabase Postgres; the board refreshes by polling every two seconds.
- The interface must work at phone width without horizontal page scroll, except inside the board itself, which scrolls horizontally by column.
- Terminology: "request" is the user's input card, "task" is a subtask card, "agent" is one of Orchestrator, Develop, Testing.

## Evidence on Hand

No marketing content, testimonials, or customer data exist. Do not invent any. The only real content is the sample request in the seed data: adding a contact page to a website.

## Product Principles

- Show the agents, not only the tasks: who is working, what they did, and what failed.
- Make state obvious without reading the log: column, badge and attempt count say where each task stands.
- One thing in progress at a time is a feature; the interface should make the queue visible, not hide it.

## Accessibility & Inclusion

Status must never rely on colour alone: each column and state has a text label. Interactive elements keep visible focus, and the layout must remain usable at 320px width.
