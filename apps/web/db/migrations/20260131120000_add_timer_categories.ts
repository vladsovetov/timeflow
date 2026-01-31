import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("timer_category")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn("user_id", "uuid", (col) =>
      col.references("user.id").onDelete("cascade")
    )
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("color", "text", (col) => col.notNull())
    .addColumn("sort_order", "integer", (col) => col.notNull().defaultTo(0))
    .execute();

  await sql`
    INSERT INTO timer_category (id, user_id, name, color, sort_order) VALUES
    (gen_random_uuid(), NULL, 'Useful', '#22c55e', 0),
    (gen_random_uuid(), NULL, 'Important', '#f59e0b', 1),
    (gen_random_uuid(), NULL, 'Procrastination', '#ef4444', 2)
  `.execute(db);

  await db.schema
    .alterTable("timer")
    .addColumn("category_id", "uuid", (col) =>
      col.references("timer_category.id").onDelete("set null")
    )
    .execute();

  const usefulCategory = await db
    .selectFrom("timer_category")
    .select("id")
    .where("user_id", "is", null)
    .where("name", "=", "Useful")
    .executeTakeFirst();

  if (usefulCategory) {
    await db
      .updateTable("timer")
      .set({ category_id: usefulCategory.id })
      .where("category_id", "is", null)
      .execute();
  }

  await sql`
    CREATE INDEX timer_category_user_id_idx ON timer_category (user_id) WHERE user_id IS NOT NULL
  `.execute(db);

  await sql`
    CREATE INDEX timer_category_id_idx ON timer (category_id) WHERE category_id IS NOT NULL
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP INDEX IF EXISTS timer_category_id_idx`.execute(db);
  await db.schema.alterTable("timer").dropColumn("category_id").execute();
  await sql`DROP INDEX IF EXISTS timer_category_user_id_idx`.execute(db);
  await db.schema.dropTable("timer_category").execute();
}
