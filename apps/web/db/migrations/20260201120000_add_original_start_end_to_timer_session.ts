import { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("timer_session")
    .addColumn("original_started_at", "timestamptz")
    .execute();

  await db.schema
    .alterTable("timer_session")
    .addColumn("original_ended_at", "timestamptz")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("timer_session")
    .dropColumn("original_ended_at")
    .execute();

  await db.schema
    .alterTable("timer_session")
    .dropColumn("original_started_at")
    .execute();
}
