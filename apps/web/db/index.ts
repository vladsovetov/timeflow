import { Kysely, PostgresDialect, sql } from "kysely";
import { Pool } from "pg";
import type { Database } from "./types";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: process.env.DATABASE_URL,
    }),
  }),
});

export { sql };
