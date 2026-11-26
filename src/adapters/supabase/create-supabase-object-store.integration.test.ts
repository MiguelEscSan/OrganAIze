import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSupabaseObjectStore } from "./create-supabase-object-store";
import type { ObjectStore } from "./object-store";

const url = process.env.SUPABASE_URL ?? "http://127.0.0.1:54600";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "";
const firstPageSize = 1000;
const uploadBatchSize = 50;

const findSkipReason = async (): Promise<string | null> => {
  if (serviceRoleKey === "" || bucket === "") {
    return "SUPABASE_SERVICE_ROLE_KEY and SUPABASE_STORAGE_BUCKET are not set";
  }

  try {
    const response = await fetch(`${url}/storage/v1/status`, { signal: AbortSignal.timeout(2000) });

    return response.ok ? null : `storage gateway at ${url} answered ${response.status}`;
  } catch {
    return `storage gateway at ${url} is not reachable (run docker compose up -d)`;
  }
};

const skipReason = await findSkipReason();

if (skipReason !== null) {
  console.warn(`Skipping Supabase object store integration tests: ${skipReason}`);
}

const uploadInBatches = async (store: ObjectStore, keys: string[]): Promise<void> => {
  for (let start = 0; start < keys.length; start += uploadBatchSize) {
    await Promise.all(keys.slice(start, start + uploadBatchSize).map((key) => store.upload(key, key)));
  }
};

const removeInBatches = async (client: SupabaseClient, keys: string[]): Promise<void> => {
  for (let start = 0; start < keys.length; start += firstPageSize) {
    await client.storage.from(bucket).remove(keys.slice(start, start + firstPageSize));
  }
};

describe.skipIf(skipReason !== null)("supabase object store against local storage", () => {
  const prefix = `integration-${randomUUID()}/`;
  let client: SupabaseClient;
  let store: ObjectStore;
  const createdKeys: string[] = [];

  const track = async (key: string, content: string): Promise<void> => {
    createdKeys.push(key);
    await store.upload(key, content);
  };

  beforeAll(async () => {
    client = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
    store = createSupabaseObjectStore(client, bucket);
    const { data, error } = await client.storage.getBucket(bucket);

    if (error || data === null) {
      throw new Error(`Bucket ${bucket} is not available: ${error?.message ?? "missing"}`);
    }

    expect(data.public).toBe(false);
  });

  afterAll(async () => {
    await removeInBatches(client, createdKeys);
  });

  it("downloads what it uploaded", async () => {
    await track(`${prefix}roundtrip.txt`, "hello storage");

    expect(await store.download(`${prefix}roundtrip.txt`)).toBe("hello storage");
  });

  it("overwrites an existing key on upload", async () => {
    await track(`${prefix}overwrite.txt`, "first");
    await store.upload(`${prefix}overwrite.txt`, "second");

    expect(await store.download(`${prefix}overwrite.txt`)).toBe("second");
  });

  it("returns null when the key does not exist", async () => {
    expect(await store.download(`${prefix}missing.txt`)).toBeNull();
  });

  it("lists nested folders recursively", async () => {
    const nestedPrefix = `${prefix}nested/`;
    await track(`${nestedPrefix}a.txt`, "a");
    await track(`${nestedPrefix}src/b.txt`, "b");
    await track(`${nestedPrefix}src/deep/c.txt`, "c");

    expect((await store.list(nestedPrefix)).sort()).toEqual([
      `${nestedPrefix}a.txt`,
      `${nestedPrefix}src/b.txt`,
      `${nestedPrefix}src/deep/c.txt`,
    ]);
  });

  it("lists more entries than one page holds", async () => {
    const pagedPrefix = `${prefix}paged/`;
    const keys = Array.from({ length: firstPageSize + 1 }, (_, index) => `${pagedPrefix}file-${index}.txt`);
    createdKeys.push(...keys);
    await uploadInBatches(store, keys);

    const listed = await store.list(pagedPrefix);

    expect(listed).toHaveLength(keys.length);
    expect(new Set(listed)).toEqual(new Set(keys));
  }, 120_000);
});
