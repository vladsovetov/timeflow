import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db, sql } from "@/db";
import { getOrCreateUser } from "@/lib/user";
import { splitSessionAtMidnight } from "@/lib/split-session-at-midnight";
import type { ErrorResponse } from "@acme/api";

export async function GET(
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

  return NextResponse.json({ data: session });
}

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

  let body: { ended_at?: string | null; started_at?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ErrorResponse,
      { status: 400 }
    );
  }

  const { ended_at, started_at } = body;

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

  const isEndSession =
    ended_at !== undefined &&
    started_at === undefined &&
    session.ended_at === null;
  const isEditSession =
    started_at !== undefined || (ended_at !== undefined && session.ended_at !== null);

  if (isEndSession) {
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
    const currentStartedAt = new Date(session.started_at);
    if (endedAtDate <= currentStartedAt) {
      return NextResponse.json(
        { error: "ended_at must be after started_at" } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    const userRecord = await db
      .selectFrom("user")
      .select(["timezone"])
      .where("id", "=", user.id)
      .where("is_deleted", "=", false)
      .executeTakeFirst();
    const tz = userRecord?.timezone || "UTC";

    const segments = splitSessionAtMidnight(
      session.started_at,
      endedAtDate,
      tz
    );

    if (segments.length > 1) {
      const firstSeg = segments[0];
      if (!firstSeg) {
        return NextResponse.json(
          { error: "Failed to split session" } satisfies ErrorResponse,
          { status: 500 }
        );
      }
      const [updated] = await db.transaction().execute(async (trx) => {
        const updatePayload: {
          ended_at: Date;
          updated_at: Date;
          updated_by: string;
          original_ended_at?: Date;
        } = {
          ended_at: firstSeg.ended_at,
          updated_at: new Date(),
          updated_by: user.id,
        };
        if (session.original_ended_at === null) {
          updatePayload.original_ended_at = endedAtDate;
        }
        await trx
          .updateTable("timer_session")
          .set(updatePayload)
          .where("id", "=", id)
          .where("user_id", "=", user.id)
          .where("is_deleted", "=", false)
          .execute();

        const sourceVal = session.source || "manual";
        const noteVal = session.note ?? null;
        const updatedBy = session.updated_by ?? user.id;

        let lastInserted: Record<string, unknown> | null = null;
        for (let i = 1; i < segments.length; i++) {
          const seg = segments[i];
          if (!seg) continue;
          const result = await sql`
            INSERT INTO timer_session (user_id, timer_id, started_at, ended_at, source, note, updated_by)
            VALUES (${user.id}, ${session.timer_id}, ${seg.started_at}, ${seg.ended_at}, ${sourceVal}, ${noteVal}, ${updatedBy})
            RETURNING *
          `.execute(trx);
          const row = result.rows[0];
          if (row && typeof row === "object" && !Array.isArray(row))
            lastInserted = { ...row };
        }
        return lastInserted ? [lastInserted] : [];
      });

      if (!updated) {
        return NextResponse.json(
          { error: "Failed to update timer session" } satisfies ErrorResponse,
          { status: 500 }
        );
      }
      return NextResponse.json({ data: updated });
    }

    const updatePayload: {
      ended_at: Date;
      updated_at: Date;
      updated_by: string;
      original_ended_at?: Date;
    } = {
      ended_at: endedAtDate,
      updated_at: new Date(),
      updated_by: user.id,
    };
    if (session.original_ended_at === null) {
      updatePayload.original_ended_at = endedAtDate;
    }
    const [updated] = await db
      .updateTable("timer_session")
      .set(updatePayload)
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

  if (isEditSession) {
    let newStartedAt: Date = new Date(session.started_at);
    let newEndedAt: Date | null = session.ended_at !== null ? new Date(session.ended_at) : null;

    if (started_at !== undefined) {
      if (typeof started_at !== "string" || !started_at.trim()) {
        return NextResponse.json(
          { error: "started_at must be a non-empty ISO datetime string" } satisfies ErrorResponse,
          { status: 400 }
        );
      }
      const parsed = new Date(started_at);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: "started_at must be a valid ISO datetime string" } satisfies ErrorResponse,
          { status: 400 }
        );
      }
      newStartedAt = parsed;
    }
    if (ended_at !== undefined) {
      if (ended_at !== null && (typeof ended_at !== "string" || !ended_at.trim())) {
        return NextResponse.json(
          { error: "ended_at must be null or a non-empty ISO datetime string" } satisfies ErrorResponse,
          { status: 400 }
        );
      }
      if (ended_at === null) {
        newEndedAt = null;
      } else {
        const parsedEnd = new Date(ended_at);
        if (Number.isNaN(parsedEnd.getTime())) {
          return NextResponse.json(
            { error: "ended_at must be a valid ISO datetime string" } satisfies ErrorResponse,
            { status: 400 }
          );
        }
        newEndedAt = parsedEnd;
      }
    }

    if (newEndedAt !== null && newEndedAt <= newStartedAt) {
      return NextResponse.json(
        { error: "ended_at must be after started_at" } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    const updatePayload: {
      started_at?: Date;
      ended_at?: Date | null;
      original_started_at?: Date;
      original_ended_at?: Date | null;
      updated_at: Date;
      updated_by: string;
    } = {
      updated_at: new Date(),
      updated_by: user.id,
    };
    if (started_at !== undefined) {
      updatePayload.started_at = newStartedAt;
      if (session.original_started_at === null) {
        updatePayload.original_started_at = new Date(session.started_at);
      }
    }
    if (ended_at !== undefined) {
      updatePayload.ended_at = newEndedAt;
      if (session.original_ended_at === null && session.ended_at !== null) {
        updatePayload.original_ended_at = new Date(session.ended_at);
      }
    }

    const [updated] = await db
      .updateTable("timer_session")
      .set(updatePayload)
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

  return NextResponse.json(
    { error: "Either ended_at (to end session) or started_at/ended_at (to edit) is required" } satisfies ErrorResponse,
    { status: 400 }
  );
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
