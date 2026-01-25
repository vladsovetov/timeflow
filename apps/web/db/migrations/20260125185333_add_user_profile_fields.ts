import { Kysely } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('user')
    .addColumn('first_name', 'text')
    .addColumn('last_name', 'text')
    .addColumn('timezone', 'text')
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('user')
    .dropColumn('first_name')
    .dropColumn('last_name')
    .dropColumn('timezone')
    .execute()
}
