import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { getOrCreateUser } from "@/lib/user";
import type { ErrorResponse } from "@acme/api";

export async function PATCH(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" } satisfies ErrorResponse,
      { status: 401 }
    );
  }

  const user = await getOrCreateUser(userId);
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" } satisfies ErrorResponse,
      { status: 401 }
    );
  }

  let body: { timer_ids?: string[] };
  try {
    body = (await request.json()) as { timer_ids?: string[] };
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ErrorResponse,
      { status: 400 }
    );
  }

  const { timer_ids } = body;
  if (!Array.isArray(timer_ids) || timer_ids.length === 0) {
    return NextResponse.json(
      { error: "timer_ids must be a non-empty array of timer IDs" } satisfies ErrorResponse,
      { status: 400 }
    );
  }

  const validUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  for (const id of timer_ids) {
    if (typeof id !== "string" || !validUuid.test(id)) {
      return NextResponse.json(
        { error: `Invalid timer ID: ${id}` } satisfies ErrorResponse,
        { status: 400 }
      );
    }
  }

  const userTimers = await db
    .selectFrom("timer")
    .select(["id"])
    .where("user_id", "=", user.id)
    .where("is_deleted", "=", false)
    .execute();

  const userTimerIds = new Set(userTimers.map((t) => t.id));
  for (const id of timer_ids) {
    if (!userTimerIds.has(id)) {
      return NextResponse.json(
        { error: `Timer not found or not owned: ${id}` } satisfies ErrorResponse,
        { status: 400 }
      );
    }
  }

  await db.transaction().execute(async (trx) => {
    for (let i = 0; i < timer_ids.length; i++) {
      await trx
        .updateTable("timer")
        .set({ sort_order: i, updated_at: new Date(), updated_by: user.id })
        .where("id", "=", timer_ids[i]!)
        .where("user_id", "=", user.id)
        .execute();
    }
  });

  return new NextResponse(null, { status: 200 });
}
