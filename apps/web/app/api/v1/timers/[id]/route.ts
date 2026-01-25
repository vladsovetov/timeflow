import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/db";
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

type AuthOk = { user: { id: string } };
type AuthErr = { error: NextResponse };

function hasUser(r: AuthOk | AuthErr): r is AuthOk {
  return "user" in r;
}

async function ensureAuth(): Promise<AuthOk | AuthErr> {
  const { userId } = await auth();
  if (!userId) {
    return { error: NextResponse.json({ error: "Unauthorized" } satisfies ErrorResponse, { status: 401 }) };
  }
  const user = await getOrCreateUser(userId);
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" } satisfies ErrorResponse, { status: 401 }) };
  }
  return { user };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await ensureAuth();
  if (!hasUser(authResult)) return authResult.error;
  const { user } = authResult;

  const { id } = await context.params;

  const timer = await db
    .selectFrom("timer")
    .selectAll()
    .where("id", "=", id)
    .where("user_id", "=", user.id)
    .where("is_deleted", "=", false)
    .executeTakeFirst();

  if (!timer) {
    return NextResponse.json(
      { error: "Timer not found" } satisfies ErrorResponse,
      { status: 404 }
    );
  }

  const userRecord = await db
    .selectFrom("user")
    .select(["timezone"])
    .where("id", "=", user.id)
    .where("is_deleted", "=", false)
    .executeTakeFirst();

  const totalTime = await calculateTotalTimerSessionTime(
    timer.id,
    user.id,
    userRecord?.timezone || null
  );
  const inProgressSessionId = await getInProgressTimerSessionId(
    timer.id,
    user.id
  );

  return NextResponse.json({
    data: {
      ...timer,
      total_timer_session_time: totalTime,
      timer_session_in_progress_id: inProgressSessionId,
    },
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await ensureAuth();
  if (!hasUser(authResult)) return authResult.error;
  const { user } = authResult;

  const { id } = await context.params;

  let body: {
    name?: string;
    color?: string;
    sort_order?: number;
    is_archived?: boolean;
    timer_type?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ErrorResponse,
      { status: 400 }
    );
  }

  const existing = await db
    .selectFrom("timer")
    .selectAll()
    .where("id", "=", id)
    .where("user_id", "=", user.id)
    .where("is_deleted", "=", false)
    .executeTakeFirst();

  if (!existing) {
    return NextResponse.json(
      { error: "Timer not found" } satisfies ErrorResponse,
      { status: 404 }
    );
  }

  const updates: {
    name?: string;
    color?: string | null;
    sort_order?: number;
    is_archived?: boolean;
    timer_type?: string;
    updated_at?: Date;
    updated_by?: string;
  } = { updated_at: new Date(), updated_by: user.id };

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json(
        { error: "name must be a non-empty string" } satisfies ErrorResponse,
        { status: 400 }
      );
    }
    updates.name = body.name.trim();
  }
  if (body.color !== undefined) {
    updates.color = typeof body.color === "string" ? body.color.trim() || null : null;
  }
  if (body.sort_order !== undefined) {
    if (typeof body.sort_order !== "number" || !Number.isFinite(body.sort_order)) {
      return NextResponse.json(
        { error: "sort_order must be a finite number" } satisfies ErrorResponse,
        { status: 400 }
      );
    }
    updates.sort_order = body.sort_order;
  }
  if (body.is_archived !== undefined) {
    if (typeof body.is_archived !== "boolean") {
      return NextResponse.json(
        { error: "is_archived must be a boolean" } satisfies ErrorResponse,
        { status: 400 }
      );
    }
    updates.is_archived = body.is_archived;
  }
  if (body.timer_type !== undefined) {
    if (typeof body.timer_type !== "string" || !body.timer_type.trim()) {
      return NextResponse.json(
        { error: "timer_type must be a non-empty string" } satisfies ErrorResponse,
        { status: 400 }
      );
    }
    const validKeys = await getValidTimerTypeKeys();
    if (!validKeys.has(body.timer_type)) {
      return NextResponse.json(
        { error: "Invalid timer_type" } satisfies ErrorResponse,
        { status: 400 }
      );
    }
    updates.timer_type = body.timer_type;
  }

  if (Object.keys(updates).length <= 2) {
    return NextResponse.json({ data: existing });
  }

  try {
    const [row] = await db
      .updateTable("timer")
      .set(updates)
      .where("id", "=", id)
      .where("user_id", "=", user.id)
      .where("is_deleted", "=", false)
      .returningAll()
      .execute();

    const userRecord = await db
      .selectFrom("user")
      .select(["timezone"])
      .where("id", "=", user.id)
      .where("is_deleted", "=", false)
      .executeTakeFirst();

    const totalTime = await calculateTotalTimerSessionTime(
      row.id,
      user.id,
      userRecord?.timezone || null
    );
    const inProgressSessionId = await getInProgressTimerSessionId(
      row.id,
      user.id
    );

    return NextResponse.json({
      data: {
        ...row,
        total_timer_session_time: totalTime,
        timer_session_in_progress_id: inProgressSessionId,
      },
    });
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

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await ensureAuth();
  if (!hasUser(authResult)) return authResult.error;
  const { user } = authResult;

  const { id } = await context.params;

  const result = await db
    .updateTable("timer")
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
      { error: "Timer not found" } satisfies ErrorResponse,
      { status: 404 }
    );
  }

  return new NextResponse(null, { status: 204 });
}
