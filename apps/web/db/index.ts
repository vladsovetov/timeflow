import { config } from "dotenv";
import { Kysely, PostgresDialect, sql } from "kysely";
import path from "path";
import { Pool } from "pg";
import { fileURLToPath } from "url";
import type { Database } from "./types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "..", ".env") });

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
