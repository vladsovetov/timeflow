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
    if (session.ended_at == null) continue; // exclude in-progress; client adds now - started_at
    const sessionStart = DateTime.fromJSDate(session.started_at, { zone: tz });
    const sessionEnd = DateTime.fromJSDate(session.ended_at, { zone: tz });
    const duration = sessionEnd.diff(sessionStart, "seconds").seconds;
    totalSeconds += Math.max(0, duration);
  }

  return Math.round(totalSeconds);
}

async function getInProgressTimerSession(
  timerId: string,
  userId: string
): Promise<{ id: string; started_at: string } | null> {
  const session = await db
    .selectFrom("timer_session")
    .select(["id", "started_at"])
    .where("timer_id", "=", timerId)
    .where("user_id", "=", userId)
    .where("is_deleted", "=", false)
    .where("ended_at", "is", null)
    .orderBy("started_at", "desc")
    .executeTakeFirst();

  if (!session) return null;
  return {
    id: session.id,
    started_at: session.started_at.toISOString(),
  };
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

  const timerRow = await db
    .selectFrom("timer")
    .leftJoin("timer_category", "timer.category_id", "timer_category.id")
    .select([
      "timer.id",
      "timer.user_id",
      "timer.timer_type",
      "timer.category_id",
      "timer.name",
      "timer.color",
      "timer.sort_order",
      "timer.min_time",
      "timer.is_archived",
      "timer.is_deleted",
      "timer.created_at",
      "timer.updated_at",
      "timer.updated_by",
      "timer_category.name as category_name",
      "timer_category.color as category_color",
      "timer_category.sort_order as category_sort_order",
      "timer_category.user_id as category_user_id",
    ])
    .where("timer.id", "=", id)
    .where("timer.user_id", "=", user.id)
    .where("timer.is_deleted", "=", false)
    .executeTakeFirst();

  if (!timerRow) {
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
    timerRow.id,
    user.id,
    userRecord?.timezone || null
  );
  const timer_session_in_progress = await getInProgressTimerSession(
    timerRow.id,
    user.id
  );

  const timer = {
    id: timerRow.id,
    user_id: timerRow.user_id,
    timer_type: timerRow.timer_type,
    category_id: timerRow.category_id,
    name: timerRow.name,
    color: timerRow.color,
    sort_order: timerRow.sort_order,
    min_time: timerRow.min_time,
    is_archived: timerRow.is_archived,
    is_deleted: timerRow.is_deleted,
    created_at: timerRow.created_at,
    updated_at: timerRow.updated_at,
    updated_by: timerRow.updated_by,
    category:
      timerRow.category_id != null && timerRow.category_name != null
        ? {
            id: timerRow.category_id,
            user_id: timerRow.category_user_id,
            name: timerRow.category_name,
            color: timerRow.category_color,
            sort_order: timerRow.category_sort_order ?? 0,
          }
        : null,
  };

  return NextResponse.json({
    data: {
      ...timer,
      total_timer_session_time: totalTime,
      timer_session_in_progress,
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
    min_time?: number | null;
    is_archived?: boolean;
    timer_type?: string;
    category_id?: string | null;
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
    min_time?: number | null;
    is_archived?: boolean;
    timer_type?: string;
    category_id?: string | null;
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
  if (body.min_time !== undefined) {
    if (body.min_time === null) {
      updates.min_time = null;
    } else if (typeof body.min_time === "number" && Number.isFinite(body.min_time) && body.min_time >= 0) {
      updates.min_time = body.min_time;
    } else {
      return NextResponse.json(
        { error: "min_time must be null or a non-negative finite number" } satisfies ErrorResponse,
        { status: 400 }
      );
    }
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
  if (body.category_id !== undefined) {
    if (body.category_id === null || body.category_id === "") {
      updates.category_id = null;
    } else if (typeof body.category_id === "string" && body.category_id.trim() !== "") {
      const categoryExists = await db
        .selectFrom("timer_category")
        .select("id")
        .where("id", "=", body.category_id.trim())
        .where((eb) =>
          eb.or([eb("user_id", "is", null), eb("user_id", "=", user.id)])
        )
        .executeTakeFirst();
      if (!categoryExists) {
        return NextResponse.json(
          { error: "Invalid category_id" } satisfies ErrorResponse,
          { status: 400 }
        );
      }
      updates.category_id = body.category_id.trim();
    } else {
      return NextResponse.json(
        { error: "category_id must be a valid UUID or null" } satisfies ErrorResponse,
        { status: 400 }
      );
    }
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

    if (!row) {
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
      row.id,
      user.id,
      userRecord?.timezone || null
    );
    const timer_session_in_progress = await getInProgressTimerSession(
      row.id,
      user.id
    );

    let category = null;
    if (row.category_id) {
      const cat = await db
        .selectFrom("timer_category")
        .selectAll()
        .where("id", "=", row.category_id)
        .executeTakeFirst();
      if (cat) {
        category = {
          id: cat.id,
          user_id: cat.user_id,
          name: cat.name,
          color: cat.color,
          sort_order: cat.sort_order,
        };
      }
    }

    return NextResponse.json({
      data: {
        ...row,
        category,
        total_timer_session_time: totalTime,
        timer_session_in_progress,
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
