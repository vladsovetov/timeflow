import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db, sql } from "@/db";
import { getOrCreateUser } from "@/lib/user";
import type { ErrorResponse } from "@acme/api";

export async function GET() {
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

  const categories = await db
    .selectFrom("timer_category")
    .selectAll()
    .where((eb) =>
      eb.or([eb("user_id", "is", null), eb("user_id", "=", user.id)])
    )
    .orderBy("sort_order", "asc")
    .orderBy("name", "asc")
    .execute();

  return NextResponse.json({ data: categories });
}

export async function POST(request: Request) {
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

  let body: { name?: string; color?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ErrorResponse,
      { status: 400 }
    );
  }

  const { name, color } = body;
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json(
      {
        error: "name is required and must be a non-empty string",
      } satisfies ErrorResponse,
      { status: 400 }
    );
  }
  if (typeof color !== "string" || !color.trim()) {
    return NextResponse.json(
      {
        error: "color is required and must be a non-empty string",
      } satisfies ErrorResponse,
      { status: 400 }
    );
  }

  const nameVal = name.trim();
  const colorVal = color.trim();

  const maxSortOrder = await db
    .selectFrom("timer_category")
    .select((eb) => eb.fn.max("sort_order").as("max"))
    .where("user_id", "=", user.id)
    .executeTakeFirst();

  const sortOrder = (maxSortOrder?.max ?? -1) + 1;

  const row = await db
    .insertInto("timer_category")
    .values({
      id: sql`gen_random_uuid()`,
      user_id: user.id,
      name: nameVal,
      color: colorVal,
      sort_order: sortOrder,
    })
    .returningAll()
    .executeTakeFirst();

  if (!row) {
    return NextResponse.json(
      { error: "Failed to create category" } satisfies ErrorResponse,
      { status: 500 }
    );
  }

  return NextResponse.json({ data: row }, { status: 201 });
}
