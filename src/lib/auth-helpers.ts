import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { SESSION_COOKIE_NAMES, isDevAuthEnabled } from "@/app/api/dev-auth/shared";

/**
 * Get the authenticated user ID from the session.
 * Returns the user ID or a 401 NextResponse if not authenticated.
 */
export async function getAuthUserId(): Promise<string | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    if (isDevAuthEnabled()) {
      const cookieStore = await cookies();

      for (const cookieName of SESSION_COOKIE_NAMES) {
        const sessionToken = cookieStore.get(cookieName)?.value;
        if (!sessionToken) {
          continue;
        }

        const devSession = await db.query.sessions.findFirst({
          where: eq(schema.sessions.sessionToken, sessionToken),
          columns: { userId: true },
        });

        if (devSession?.userId) {
          return devSession.userId;
        }
      }
    }

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session.user.id;
}
