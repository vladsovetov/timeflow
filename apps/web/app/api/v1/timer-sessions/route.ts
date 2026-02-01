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

  const timerSessions = await db
    .selectFrom("timer_session")
    .selectAll()
    .where("user_id", "=", user.id)
    .where("is_deleted", "=", false)
    .orderBy("started_at", "desc")
    .execute();

  return NextResponse.json({ data: timerSessions });
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

  let body: {
    timer_id?: string;
    started_at?: string;
    ended_at?: string | null;
    source?: string;
    note?: string | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ErrorResponse,
      { status: 400 }
    );
  }

  const { timer_id, started_at, ended_at, source, note } = body;
  if (typeof timer_id !== "string" || !timer_id.trim()) {
    return NextResponse.json(
      { error: "timer_id is required and must be a non-empty string" } satisfies ErrorResponse,
      { status: 400 }
    );
  }

  // Verify timer exists and belongs to user
  const timer = await db
    .selectFrom("timer")
    .select("id")
    .where("id", "=", timer_id)
    .where("user_id", "=", user.id)
    .where("is_deleted", "=", false)
    .executeTakeFirst();

  if (!timer) {
    return NextResponse.json(
      { error: "Timer not found" } satisfies ErrorResponse,
      { status: 404 }
    );
  }

  // Parse and validate started_at
  let startedAtDate: Date;
  if (started_at) {
    const parsed = new Date(started_at);
    if (isNaN(parsed.getTime())) {
      return NextResponse.json(
        { error: "started_at must be a valid ISO datetime string" } satisfies ErrorResponse,
        { status: 400 }
      );
    }
    startedAtDate = parsed;
  } else {
    startedAtDate = new Date();
  }

  // Parse and validate ended_at if provided
  let endedAtDate: Date | null = null;
  if (ended_at !== undefined && ended_at !== null) {
    const parsed = new Date(ended_at);
    if (isNaN(parsed.getTime())) {
      return NextResponse.json(
        { error: "ended_at must be a valid ISO datetime string" } satisfies ErrorResponse,
        { status: 400 }
      );
    }
    endedAtDate = parsed;
    // Validate that ended_at is after started_at
    if (endedAtDate <= startedAtDate) {
      return NextResponse.json(
        { error: "ended_at must be after started_at" } satisfies ErrorResponse,
        { status: 400 }
      );
    }
  }

  const sourceVal = typeof source === "string" ? source.trim() || "manual" : "manual";
  const noteVal = typeof note === "string" ? note.trim() || null : null;

  try {
    const row = await db.transaction().execute(async (trx) => {
      // Only one timer can run at a time: end any other currently running session for this user
      const otherRunning = await trx
        .selectFrom("timer_session")
        .select("id")
        .where("user_id", "=", user.id)
        .where("is_deleted", "=", false)
        .where("ended_at", "is", null)
        .execute();

      for (const session of otherRunning) {
        await trx
          .updateTable("timer_session")
          .set({
            ended_at: startedAtDate,
            updated_at: new Date(),
            updated_by: user.id,
          })
          .where("id", "=", session.id)
          .where("user_id", "=", user.id)
          .execute();
      }

      const result = await sql`
        INSERT INTO timer_session (user_id, timer_id, started_at, ended_at, source, note, updated_by)
        VALUES (${user.id}, ${timer_id}, ${startedAtDate}, ${endedAtDate}, ${sourceVal}, ${noteVal}, ${user.id})
        RETURNING *
      `.execute(trx);
      return result.rows[0];
    });

    if (!row) {
      return NextResponse.json(
        { error: "Failed to create timer session" } satisfies ErrorResponse,
        { status: 500 }
      );
    }
    return NextResponse.json({ data: row }, { status: 201 });
  } catch (e: unknown) {
    const err = e as { code?: string; constraint?: string };
    if (err.code === "23505") {
      // Unique constraint violation - likely the active session constraint
      if (err.constraint?.includes("active_unique")) {
        return NextResponse.json(
          { error: "An active session already exists for this timer" } satisfies ErrorResponse,
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "A timer session with these properties already exists" } satisfies ErrorResponse,
        { status: 409 }
      );
    }
    if (err.code === "23514") {
      // Check constraint violation - likely the ended_at > started_at constraint
      return NextResponse.json(
        { error: "ended_at must be after started_at" } satisfies ErrorResponse,
        { status: 400 }
      );
    }
    throw e;
  }
}
