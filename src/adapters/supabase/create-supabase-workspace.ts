import { createClient } from "@supabase/supabase-js";
import type { ObjectStore } from "./object-store";
import { createSupabaseObjectStore } from "./create-supabase-object-store";

const requiredEnv = (name: string): string => {
  const value = process.env[name];

  if (value === undefined || value.trim().length === 0) {
    throw new Error(`Missing required environment variable ${name}`);
  }

  return value;
};

export const createSupabaseObjectStoreFromEnv = (): ObjectStore => {
  const url = requiredEnv("SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const bucket = requiredEnv("SUPABASE_STORAGE_BUCKET");

  return createSupabaseObjectStore(createClient(url, serviceRoleKey, { auth: { persistSession: false } }), bucket);
};
