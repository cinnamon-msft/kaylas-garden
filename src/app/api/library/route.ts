import { NextResponse } from "next/server";

export function GET(): NextResponse {
  return NextResponse.json(
    {
      error:
        "The plant library lookup is temporarily unavailable. A static plant database will be added in a future update.",
    },
    { status: 503 },
  );
}
