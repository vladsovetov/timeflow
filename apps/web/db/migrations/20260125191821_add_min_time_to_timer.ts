import { Kysely } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('timer')
    .addColumn('min_time', 'integer')
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('timer')
    .dropColumn('min_time')
    .execute()
}
