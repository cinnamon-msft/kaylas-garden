import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Get the authenticated user ID from the session.
 * Returns the user ID or a 401 NextResponse if not authenticated.
 */
export async function getAuthUserId(): Promise<string | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session.user.id;
}
