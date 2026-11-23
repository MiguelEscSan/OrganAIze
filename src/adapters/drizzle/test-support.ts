import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import type { Database } from "./client";
import { createDatabase } from "./client";

export const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? "postgres://agent_team:agent_team_local@localhost:5432/agent_team_test";

export const openTestDatabase = async (): Promise<Database> => {
  const db = createDatabase(testDatabaseUrl);
  await migrate(db, { migrationsFolder: "drizzle" });
  return db;
};

export const resetTestDatabase = async (db: Database): Promise<void> => {
  await db.execute(sql`truncate table tasks, requests, task_events, settings restart identity cascade`);
};
