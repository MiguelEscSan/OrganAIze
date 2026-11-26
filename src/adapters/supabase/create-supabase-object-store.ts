import type { SupabaseClient } from "@supabase/supabase-js";
import type { ObjectStore } from "./object-store";

const pageSize = 1000;

const listFolder = async (client: SupabaseClient, bucket: string, folder: string): Promise<string[]> => {
  const keys: string[] = [];

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client.storage
      .from(bucket)
      .list(folder.replace(/\/$/, ""), { limit: pageSize, offset });

    if (error) {
      throw new Error(`Storage list failed: ${error.message}`);
    }

    const entries = data ?? [];
    const nested = await Promise.all(
      entries.map((entry) =>
        entry.id === null ? listFolder(client, bucket, `${folder}${entry.name}/`) : Promise.resolve([`${folder}${entry.name}`]),
      ),
    );
    keys.push(...nested.flat());

    if (entries.length < pageSize) {
      return keys;
    }
  }
};

export const createSupabaseObjectStore = (client: SupabaseClient, bucket: string): ObjectStore => ({
  list: (prefix) => listFolder(client, bucket, prefix),
  download: async (key) => {
    const { data, error } = await client.storage.from(bucket).download(key);

    if (error || data === null) {
      return null;
    }

    return data.text();
  },
  upload: async (key, content) => {
    const { error } = await client.storage
      .from(bucket)
      .upload(key, new Blob([content], { type: "text/plain;charset=utf-8" }), { upsert: true });

    if (error) {
      throw new Error(`Storage upload failed for ${key}: ${error.message}`);
    }
  },
});
