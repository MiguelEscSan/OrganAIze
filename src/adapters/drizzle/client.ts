import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = ReturnType<typeof createDatabase>;

export const createDatabase = (connectionString: string) =>
  drizzle(postgres(connectionString, { max: 1, prepare: false }), { schema });
