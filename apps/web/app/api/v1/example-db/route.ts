import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

// Example endpoint showing database usage
export async function GET() {
  try {
    // Example query - replace with your actual queries
    const result = await sql`SELECT NOW() as current_time`;
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Database connection failed" },
      { status: 500 }
    );
  }
}
