import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db, sql } from "@/db";
import { getOrCreateUser } from "@/lib/user";
import type { ErrorResponse } from "@acme/api";
import { DateTime } from "luxon";

async function getValidTimerTypeKeys(): Promise<Set<string>> {
  const rows = await db
    .selectFrom("timer_type_enum")
    .select("key")
    .execute();
  return new Set(rows.map((r: { key: string }) => r.key));
}

async function calculateTotalTimerSessionTime(
  timerId: string,
  userId: string,
  timezone: string | null
): Promise<number> {
  const tz = timezone || "UTC";
  const now = DateTime.now().setZone(tz);
  const startOfDay = now.startOf("day");
  const endOfDay = now.endOf("day");

  const sessions = await db
    .selectFrom("timer_session")
    .select(["started_at", "ended_at"])
    .where("timer_id", "=", timerId)
    .where("user_id", "=", userId)
    .where("is_deleted", "=", false)
    .where("started_at", ">=", startOfDay.toJSDate())
    .where("started_at", "<=", endOfDay.toJSDate())
    .execute();

  let totalSeconds = 0;

  for (const session of sessions) {
    const sessionStart = DateTime.fromJSDate(session.started_at, { zone: tz });
    const sessionEnd = session.ended_at
      ? DateTime.fromJSDate(session.ended_at, { zone: tz })
      : now;

    const duration = sessionEnd.diff(sessionStart, "seconds").seconds;
    totalSeconds += Math.max(0, duration);
  }

  return Math.round(totalSeconds);
}

async function getInProgressTimerSessionId(
  timerId: string,
  userId: string
): Promise<string | null> {
  const session = await db
    .selectFrom("timer_session")
    .select("id")
    .where("timer_id", "=", timerId)
    .where("user_id", "=", userId)
    .where("is_deleted", "=", false)
    .where("ended_at", "is", null)
    .orderBy("started_at", "desc")
    .executeTakeFirst();

  return session?.id || null;
}

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

  const userRecord = await db
    .selectFrom("user")
    .select(["timezone"])
    .where("id", "=", user.id)
    .where("is_deleted", "=", false)
    .executeTakeFirst();

  const timers = await db
    .selectFrom("timer")
    .selectAll()
    .where("user_id", "=", user.id)
    .where("is_deleted", "=", false)
    .orderBy("sort_order", "asc")
    .orderBy("created_at", "asc")
    .execute();

  const timersWithTotalTime = await Promise.all(
    timers.map(async (timer) => {
      const totalTime = await calculateTotalTimerSessionTime(
        timer.id,
        user.id,
        userRecord?.timezone || null
      );
      const inProgressSessionId = await getInProgressTimerSessionId(
        timer.id,
        user.id
      );
      return {
        ...timer,
        total_timer_session_time: totalTime,
        timer_session_in_progress_id: inProgressSessionId,
      };
    })
  );

  return NextResponse.json({ data: timersWithTotalTime });
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
    timer_type?: string;
    name?: string;
    color?: string;
    sort_order?: number;
    is_archived?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ErrorResponse,
      { status: 400 }
    );
  }

  const { timer_type, name, color, sort_order, is_archived } = body;
  if (typeof timer_type !== "string" || !timer_type.trim()) {
    return NextResponse.json(
      { error: "timer_type is required and must be a non-empty string" } satisfies ErrorResponse,
      { status: 400 }
    );
  }
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json(
      { error: "name is required and must be a non-empty string" } satisfies ErrorResponse,
      { status: 400 }
    );
  }

  const validKeys = await getValidTimerTypeKeys();
  if (!validKeys.has(timer_type)) {
    return NextResponse.json(
      { error: "Invalid timer_type" } satisfies ErrorResponse,
      { status: 400 }
    );
  }

  const nameVal = name.trim();
  const colorVal = typeof color === "string" ? color.trim() || null : null;
  const sortOrder =
    typeof sort_order === "number" && Number.isFinite(sort_order)
      ? sort_order
      : 0;
  const isArchived = typeof is_archived === "boolean" ? is_archived : false;

  try {
    const result = await sql`
      INSERT INTO timer (user_id, timer_type, name, color, sort_order, is_archived, updated_by)
      VALUES (${user.id}, ${timer_type}, ${nameVal}, ${colorVal}, ${sortOrder}, ${isArchived}, ${user.id})
      RETURNING *
    `.execute(db);
    const row = result.rows[0];
    if (!row) {
      return NextResponse.json(
        { error: "Failed to create timer" } satisfies ErrorResponse,
        { status: 500 }
      );
    }
    const inProgressSessionId = await getInProgressTimerSessionId(
      row.id,
      user.id
    );
    return NextResponse.json(
      {
        data: {
          ...row,
          total_timer_session_time: 0,
          timer_session_in_progress_id: inProgressSessionId,
        },
      },
      { status: 201 }
    );
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "23505") {
      return NextResponse.json(
        { error: "A timer with this name already exists" } satisfies ErrorResponse,
        { status: 409 }
      );
    }
    throw e;
  }
}
