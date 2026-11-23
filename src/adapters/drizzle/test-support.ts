import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import type { Database } from "./client";
import { createDatabase } from "./client";

export const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? "postgres://agent_team:agent_team_local@localhost:5432/agent_team_test";

const databaseNameOf = (connectionString: string): string => new URL(connectionString).pathname.slice(1);

const assertTestDatabase = (connectionString: string): void => {
  if (!databaseNameOf(connectionString).endsWith("_test")) {
    throw new Error(`Refusing to reset a database whose name does not end in _test: ${databaseNameOf(connectionString)}`);
  }
};

export const openTestDatabase = async (): Promise<Database> => {
  assertTestDatabase(testDatabaseUrl);
  const db = createDatabase(testDatabaseUrl);
  await migrate(db, { migrationsFolder: "drizzle" });
  return db;
};

export const resetTestDatabase = async (db: Database): Promise<void> => {
  await db.execute(sql`truncate table tasks, requests, task_events, settings, boards restart identity cascade`);
};
