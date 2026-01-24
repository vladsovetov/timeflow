import { generateOpenApiDocument } from "@acme/api";
import { NextResponse } from "next/server";

export async function GET() {
  const document = generateOpenApiDocument();
  return NextResponse.json(document);
}
