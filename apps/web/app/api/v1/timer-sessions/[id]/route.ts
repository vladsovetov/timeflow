import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { getOrCreateUser } from "@/lib/user";
import type { ErrorResponse } from "@acme/api";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
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

  const { id } = await context.params;

  let body: { ended_at?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ErrorResponse,
      { status: 400 }
    );
  }

  const { ended_at } = body;
  if (typeof ended_at !== "string" || !ended_at.trim()) {
    return NextResponse.json(
      { error: "ended_at is required and must be a non-empty ISO datetime string" } satisfies ErrorResponse,
      { status: 400 }
    );
  }

  const endedAtDate = new Date(ended_at);
  if (Number.isNaN(endedAtDate.getTime())) {
    return NextResponse.json(
      { error: "ended_at must be a valid ISO datetime string" } satisfies ErrorResponse,
      { status: 400 }
    );
  }

  const session = await db
    .selectFrom("timer_session")
    .selectAll()
    .where("id", "=", id)
    .where("user_id", "=", user.id)
    .where("is_deleted", "=", false)
    .executeTakeFirst();

  if (!session) {
    return NextResponse.json(
      { error: "Timer session not found" } satisfies ErrorResponse,
      { status: 404 }
    );
  }

  if (session.ended_at !== null) {
    return NextResponse.json(
      { error: "Timer session is already ended" } satisfies ErrorResponse,
      { status: 400 }
    );
  }

  const startedAt = new Date(session.started_at);
  if (endedAtDate <= startedAt) {
    return NextResponse.json(
      { error: "ended_at must be after started_at" } satisfies ErrorResponse,
      { status: 400 }
    );
  }

  const [updated] = await db
    .updateTable("timer_session")
    .set({
      ended_at: endedAtDate,
      updated_at: new Date(),
      updated_by: user.id,
    })
    .where("id", "=", id)
    .where("user_id", "=", user.id)
    .where("is_deleted", "=", false)
    .returningAll()
    .execute();

  if (!updated) {
    return NextResponse.json(
      { error: "Failed to update timer session" } satisfies ErrorResponse,
      { status: 500 }
    );
  }

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
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

  const { id } = await context.params;

  const result = await db
    .updateTable("timer_session")
    .set({
      is_deleted: true,
      updated_at: new Date(),
      updated_by: user.id,
    })
    .where("id", "=", id)
    .where("user_id", "=", user.id)
    .where("is_deleted", "=", false)
    .returningAll()
    .execute();

  if (result.length === 0) {
    return NextResponse.json(
      { error: "Timer session not found" } satisfies ErrorResponse,
      { status: 404 }
    );
  }

  return new NextResponse(null, { status: 204 });
}
