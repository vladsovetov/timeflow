import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { getOrCreateUser } from "@/lib/user";
import type { MeResponse, UpdateProfileRequest, ErrorResponse } from "@acme/api";

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
    .select(["id", "first_name", "last_name", "timezone"])
    .where("id", "=", user.id)
    .where("is_deleted", "=", false)
    .executeTakeFirst();

  if (!userRecord) {
    return NextResponse.json(
      { error: "User not found" } satisfies ErrorResponse,
      { status: 404 }
    );
  }

  return NextResponse.json({
    userId,
    first_name: userRecord.first_name,
    last_name: userRecord.last_name,
    timezone: userRecord.timezone,
  } satisfies MeResponse);
}

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

  let body: UpdateProfileRequest;
  try {
    body = (await request.json()) as UpdateProfileRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ErrorResponse,
      { status: 400 }
    );
  }

  const updates: {
    first_name?: string | null;
    last_name?: string | null;
    timezone?: string | null;
    updated_at?: Date;
    updated_by?: string;
  } = { updated_at: new Date(), updated_by: user.id };

  if (body.first_name !== undefined) {
    updates.first_name = typeof body.first_name === "string" && body.first_name.trim() ? body.first_name.trim() : null;
  }
  if (body.last_name !== undefined) {
    updates.last_name = typeof body.last_name === "string" && body.last_name.trim() ? body.last_name.trim() : null;
  }
  if (body.timezone !== undefined) {
    updates.timezone = typeof body.timezone === "string" && body.timezone.trim() ? body.timezone.trim() : null;
  }

  if (Object.keys(updates).length <= 2) {
    const userRecord = await db
      .selectFrom("user")
      .select(["id", "first_name", "last_name", "timezone"])
      .where("id", "=", user.id)
      .where("is_deleted", "=", false)
      .executeTakeFirst();

    if (!userRecord) {
      return NextResponse.json(
        { error: "User not found" } satisfies ErrorResponse,
        { status: 404 }
      );
    }

    return NextResponse.json({
      userId,
      first_name: userRecord.first_name,
      last_name: userRecord.last_name,
      timezone: userRecord.timezone,
    } satisfies MeResponse);
  }

  const [updated] = await db
    .updateTable("user")
    .set(updates)
    .where("id", "=", user.id)
    .where("is_deleted", "=", false)
    .returning(["id", "first_name", "last_name", "timezone"])
    .execute();

  if (!updated) {
    return NextResponse.json(
      { error: "User not found" } satisfies ErrorResponse,
      { status: 404 }
    );
  }

  return NextResponse.json({
    userId,
    first_name: updated.first_name,
    last_name: updated.last_name,
    timezone: updated.timezone,
  } satisfies MeResponse);
}
