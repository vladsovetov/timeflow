import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { getOrCreateUser } from "@/lib/user";
import type { ErrorResponse } from "@acme/api";
import { DateTime } from "luxon";

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

function parseDateOnly(dateStr: string): DateTime | null {
  const parsed = DateTime.fromISO(dateStr, { zone: "UTC" });
  if (!parsed.isValid) {
    return null;
  }
  // Ensure it's a date-only value (no time component)
  if (dateStr.length !== 10 || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return null;
  }
  return parsed.startOf("day");
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await ensureAuth();
  if (!hasUser(authResult)) return authResult.error;
  const { user } = authResult;

  const { id } = await context.params;

  // Verify timer exists and belongs to user
  const timer = await db
    .selectFrom("timer")
    .select("id")
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

  // Get user timezone
  const userRecord = await db
    .selectFrom("user")
    .select(["timezone"])
    .where("id", "=", user.id)
    .where("is_deleted", "=", false)
    .executeTakeFirst();

  const timezone = userRecord?.timezone || "UTC";

  // Parse query parameters
  const url = new URL(request.url);
  const startDateStr = url.searchParams.get("start_date");
  const endDateStr = url.searchParams.get("end_date");

  let startDate: DateTime | null = null;
  let endDate: DateTime | null = null;

  if (startDateStr) {
    startDate = parseDateOnly(startDateStr);
    if (!startDate) {
      return NextResponse.json(
        { error: "start_date must be a valid date in YYYY-MM-DD format" } satisfies ErrorResponse,
        { status: 400 }
      );
    }
  }

  if (endDateStr) {
    endDate = parseDateOnly(endDateStr);
    if (!endDate) {
      return NextResponse.json(
        { error: "end_date must be a valid date in YYYY-MM-DD format" } satisfies ErrorResponse,
        { status: 400 }
      );
    }
  }

  // Validate date range
  if (startDate && endDate && endDate < startDate) {
    return NextResponse.json(
      { error: "end_date must be greater than or equal to start_date" } satisfies ErrorResponse,
      { status: 400 }
    );
  }

  // Build query for timer sessions
  let query = db
    .selectFrom("timer_session")
    .select(["started_at", "ended_at"])
    .where("timer_id", "=", timer.id)
    .where("user_id", "=", user.id)
    .where("is_deleted", "=", false);

  // Apply date range filters if provided
  if (startDate) {
    const startDateTime = startDate.setZone(timezone).startOf("day").toJSDate();
    query = query.where("started_at", ">=", startDateTime);
  }

  if (endDate) {
    const endDateTime = endDate.setZone(timezone).endOf("day").toJSDate();
    query = query.where("started_at", "<=", endDateTime);
  }

  const sessions = await query.execute();

  // Group sessions by day and calculate totals
  const dailyStats = new Map<string, number>();

  for (const session of sessions) {
    const sessionStart = DateTime.fromJSDate(session.started_at, { zone: timezone });
    const sessionEnd = session.ended_at
      ? DateTime.fromJSDate(session.ended_at, { zone: timezone })
      : DateTime.now().setZone(timezone);

    // Handle sessions that span multiple days
    let currentDay = sessionStart.startOf("day");
    const sessionEndDay = sessionEnd.startOf("day");

    while (currentDay <= sessionEndDay) {
      const dayStart = currentDay.startOf("day");
      const dayEnd = currentDay.endOf("day");

      // Calculate the portion of the session that falls within this day
      const effectiveStart = sessionStart > dayStart ? sessionStart : dayStart;
      const effectiveEnd = sessionEnd < dayEnd ? sessionEnd : dayEnd;

      const duration = effectiveEnd.diff(effectiveStart, "seconds").seconds;
      if (duration > 0) {
        const dateKey = currentDay.toFormat("yyyy-MM-dd");
        dailyStats.set(dateKey, (dailyStats.get(dateKey) || 0) + duration);
      }

      // Move to next day
      currentDay = currentDay.plus({ days: 1 });
    }
  }

  // Convert map to array and sort by date
  const stats = Array.from(dailyStats.entries())
    .map(([date, totalSeconds]) => ({
      date,
      total_timer_session_time: Math.round(totalSeconds),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({ data: stats });
}
