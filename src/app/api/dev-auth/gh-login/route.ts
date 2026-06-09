import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { fetchGhUser, GhCliError } from "@/lib/dev-gh-user";
import {
  getRequestOrigin,
  getSafeCallbackUrl,
  isDevAuthEnabled,
  SESSION_COOKIE_NAMES,
  validateDevAuthToken,
} from "@/app/api/dev-auth/shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SESSION_DURATION_DAYS = 30;

export async function GET(request: Request): Promise<NextResponse> {
  const requestUrl = new URL(request.url);

  if (!isDevAuthEnabled()) {
    return NextResponse.json({ error: "Development auth is not enabled." }, { status: 404 });
  }

  const tokenError = validateDevAuthToken(requestUrl);
  if (tokenError) {
    return tokenError;
  }

  let ghUser;
  try {
    ghUser = await fetchGhUser();
  } catch (err) {
    if (err instanceof GhCliError) {
      console.error("[dev-auth/gh-login]", err.message, err.hint ?? "");
      return NextResponse.json(
        { error: err.message, hint: err.hint ?? null },
        { status: 502 }
      );
    }
    console.error("[dev-auth/gh-login] unexpected error", err);
    return NextResponse.json({ error: "Failed to read gh CLI identity." }, { status: 500 });
  }

  const userId = `dev-gh-${ghUser.id}`;
  const username = `dev-gh-${ghUser.login}`;
  const email = `dev-gh-${ghUser.login}@users.noreply.localhost`;
  const name = ghUser.name ?? ghUser.login;
  const sessionToken = `${randomUUID()}${randomUUID()}`.replaceAll("-", "");
  const expires = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(schema.users)
        .values({
          id: userId,
          name,
          email,
          username,
          image: ghUser.avatar_url,
          location: ghUser.location,
        })
        .onConflictDoUpdate({
          target: schema.users.id,
          set: {
            name,
            email,
            username,
            image: ghUser.avatar_url,
            location: ghUser.location,
          },
        });

      await tx
        .insert(schema.userSettings)
        .values({
          userId,
          theme: "green",
          gardenName: `${name}'s Garden`,
          location: ghUser.location,
        })
        .onConflictDoNothing();

      await tx.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
      await tx.insert(schema.sessions).values({
        sessionToken,
        userId,
        expires,
      });
    });
  } catch (err) {
    console.error("GET /api/dev-auth/gh-login failed:", err);
    const message = err instanceof Error ? err.message : "Failed to create development session";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const requestOrigin = getRequestOrigin(request, requestUrl);
  const response = NextResponse.redirect(getSafeCallbackUrl(requestUrl, requestOrigin));

  for (const cookieName of SESSION_COOKIE_NAMES) {
    response.cookies.set({
      name: cookieName,
      value: sessionToken,
      expires,
      httpOnly: true,
      sameSite: "lax",
      secure: requestOrigin.startsWith("https://"),
      path: "/",
    });
  }

  return response;
}
