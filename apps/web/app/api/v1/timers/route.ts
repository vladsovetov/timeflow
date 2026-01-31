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
    .where("timer.user_id", "=", user.id)
    .where("timer.is_deleted", "=", false)
    .orderBy("timer.sort_order", "asc")
    .orderBy("timer.created_at", "asc")
    .execute();

  const timersWithTotalTime = await Promise.all(
    timers.map(async (row) => {
      const timer = {
        id: row.id,
        user_id: row.user_id,
        timer_type: row.timer_type,
        category_id: row.category_id,
        name: row.name,
        color: row.color,
        sort_order: row.sort_order,
        min_time: row.min_time,
        is_archived: row.is_archived,
        is_deleted: row.is_deleted,
        created_at: row.created_at,
        updated_at: row.updated_at,
        updated_by: row.updated_by,
        category:
          row.category_id != null && row.category_name != null
            ? {
                id: row.category_id,
                user_id: row.category_user_id,
                name: row.category_name,
                color: row.category_color,
                sort_order: row.category_sort_order ?? 0,
              }
            : null,
      };
      const totalTime = await calculateTotalTimerSessionTime(
        timer.id,
        user.id,
        userRecord?.timezone || null
      );
      const timer_session_in_progress = await getInProgressTimerSession(
        timer.id,
        user.id
      );
      return {
        ...timer,
        total_timer_session_time: totalTime,
        timer_session_in_progress,
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
    category_id?: string;
    name?: string;
    color?: string;
    sort_order?: number;
    min_time?: number | null;
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

  const { timer_type, category_id, name, color, sort_order, min_time, is_archived } = body;
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

  let categoryIdVal: string | null = null;
  if (category_id != null && category_id.trim() !== "") {
    const categoryExists = await db
      .selectFrom("timer_category")
      .select("id")
      .where("id", "=", category_id.trim())
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
    categoryIdVal = category_id.trim();
  }

  const nameVal = name.trim();
  const colorVal = typeof color === "string" ? color.trim() || null : null;
  const sortOrder =
    typeof sort_order === "number" && Number.isFinite(sort_order)
      ? sort_order
      : 0;
  let minTime: number | null = null;
  if (min_time !== undefined && min_time !== null) {
    if (typeof min_time !== "number" || !Number.isFinite(min_time) || min_time < 0) {
      return NextResponse.json(
        { error: "min_time must be a non-negative finite number" } satisfies ErrorResponse,
        { status: 400 }
      );
    }
    minTime = min_time;
  }
  const isArchived = typeof is_archived === "boolean" ? is_archived : false;

  try {
    const row = await db
      .insertInto("timer")
      .values({
        id: sql`gen_random_uuid()`,
        user_id: user.id,
        timer_type,
        category_id: categoryIdVal,
        name: nameVal,
        color: colorVal,
        sort_order: sortOrder,
        min_time: minTime,
        is_archived: isArchived,
        is_deleted: false,
        created_at: sql`now()`,
        updated_at: sql`now()`,
        updated_by: user.id,
      })
      .returningAll()
      .executeTakeFirst();

    if (!row) {
      return NextResponse.json(
        { error: "Failed to create timer" } satisfies ErrorResponse,
        { status: 500 }
      );
    }

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

    return NextResponse.json(
      {
        data: {
          ...row,
          category,
          total_timer_session_time: 0,
          timer_session_in_progress,
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
