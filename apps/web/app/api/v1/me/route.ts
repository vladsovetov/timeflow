import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { MeResponse, ErrorResponse } from "@acme/api";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" } satisfies ErrorResponse,
      { status: 401 }
    );
  }

  return NextResponse.json({ userId } satisfies MeResponse);
}
