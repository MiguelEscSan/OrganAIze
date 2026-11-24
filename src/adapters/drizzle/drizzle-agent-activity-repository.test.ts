import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDrizzleAgentActivityRepository } from "./drizzle-agent-activity-repository";
import { openTestDatabase, resetTestDatabase } from "./test-support";
import type { Database } from "./client";

let db: Database;

beforeAll(async () => {
  db = await openTestDatabase();
});

beforeEach(async () => {
  await resetTestDatabase(db);
});

afterAll(async () => {
  await db.$client.end();
});

describe("drizzle agent activity repository", () => {
  it("lists nothing before any agent has recorded activity", async () => {
    expect(await createDrizzleAgentActivityRepository(db).list()).toEqual([]);
  });

  it("keeps one record per agent and replaces it with the latest state", async () => {
    const repository = createDrizzleAgentActivityRepository(db);

    await repository.record({ agent: "develop", state: "working", message: "Writing a subtask" });
    await repository.record({ agent: "develop", state: "idle", message: "Waiting for a subtask in progress" });
    await repository.record({ agent: "testing", state: "reviewing", message: "Reviewing a subtask in QA" });

    const records = await repository.list();

    expect(records).toHaveLength(2);
    expect(records).toEqual(
      expect.arrayContaining([
        { agent: "develop", state: "idle", message: "Waiting for a subtask in progress" },
        { agent: "testing", state: "reviewing", message: "Reviewing a subtask in QA" },
      ]),
    );
  });
});
