import { db, sql } from "@/db";

export async function getOrCreateUser(
  clerkUserId: string
): Promise<{ id: string } | null> {
  const existing = await db
    .selectFrom("user")
    .select("id")
    .where("clerk_user_id", "=", clerkUserId)
    .where("is_deleted", "=", false)
    .executeTakeFirst();

  if (existing) return { id: existing.id };

  try {
    const row = await db
      .insertInto("user")
      .values({
        id: sql`gen_random_uuid()`,
        clerk_user_id: clerkUserId,
        is_deleted: false,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    await db
      .insertInto("timer")
      .values({
        id: sql`gen_random_uuid()`,
        user_id: row.id,
        timer_type: "sleep",
        name: "Sleep",
        color: null,
        sort_order: 0,
        min_time: null,
        is_archived: false,
        is_deleted: false,
        created_at: sql`now()`,
        updated_at: sql`now()`,
        updated_by: row.id,
      })
      .execute();

    return { id: row.id };
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "23505") {
      const again = await db
        .selectFrom("user")
        .select("id")
        .where("clerk_user_id", "=", clerkUserId)
        .where("is_deleted", "=", false)
        .executeTakeFirst();
      return again ? { id: again.id } : null;
    }
    throw e;
  }
}
