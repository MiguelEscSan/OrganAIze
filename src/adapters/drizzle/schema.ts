import { sql } from "drizzle-orm";
import { type AnyPgColumn, boolean, check, integer, jsonb, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

export const requests = pgTable("requests", {
  id: text("id").primaryKey(),
  boardId: text("board_id")
    .notNull()
    .references(() => boards.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
});

export const tasks = pgTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    position: integer("position").generatedAlwaysAsIdentity().notNull(),
    requestId: text("request_id")
      .notNull()
      .references(() => requests.id, { onDelete: "cascade" }),
    parentTaskId: text("parent_task_id").references((): AnyPgColumn => tasks.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    acceptanceCriteria: jsonb("acceptance_criteria").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    files: jsonb("files").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    status: varchar("status", { length: 16 }).notNull(),
    assignedAgent: varchar("assigned_agent", { length: 16 }),
    attempts: integer("attempts").notNull().default(0),
    lastFeedback: text("last_feedback"),
    reviewReason: varchar("review_reason", { length: 16 }),
  },
  (table) => [
    uniqueIndex("tasks_one_request_in_progress")
      .on(table.status)
      .where(sql`${table.status} = 'in_progress' and ${table.parentTaskId} is null`),
    check(
      "tasks_status_valid",
      sql`${table.status} in ('definition', 'ready', 'in_progress', 'qa', 'deploy', 'review')`,
    ),
  ],
);

export const taskEvents = pgTable("task_events", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  taskId: text("task_id").notNull(),
  fromStatus: varchar("from_status", { length: 16 }).notNull(),
  toStatus: varchar("to_status", { length: 16 }).notNull(),
  actor: varchar("actor", { length: 8 }).notNull(),
  reason: text("reason").notNull(),
  at: timestamp("at", { withTimezone: true }).notNull(),
});

export const boards = pgTable(
  "boards",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    rootPath: text("root_path").notNull(),
  },
  (table) => [uniqueIndex("boards_root_path").on(table.rootPath)],
);

export const settings = pgTable(
  "settings",
  {
    singleton: boolean("singleton").primaryKey().default(true),
    maxAttempts: integer("max_attempts").notNull(),
    maxMinutes: integer("max_minutes").notNull(),
    maxTokens: integer("max_tokens").notNull(),
    maxQaTasks: integer("max_qa_tasks").notNull().default(2),
    teamName: text("team_name").notNull().default("Agent Team"),
    autoRefresh: boolean("auto_refresh").notNull().default(true),
  },
  (table) => [check("settings_singleton", sql`${table.singleton} = true`)],
);
