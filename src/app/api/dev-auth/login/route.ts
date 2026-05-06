import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEV_USER_ID = "dev-user";
const SESSION_COOKIE_NAME = "authjs.session-token";
const SESSION_DURATION_DAYS = 30;

function isDevAuthEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.DEV_AUTH_ENABLED === "true";
}

function getSafeCallbackUrl(requestUrl: URL): URL {
  const callbackUrl = requestUrl.searchParams.get("callbackUrl") || "/";
  const fallback = new URL("/", requestUrl.origin);

  if (!callbackUrl.startsWith("/") || callbackUrl.startsWith("//")) {
    return fallback;
  }

  return new URL(callbackUrl, requestUrl.origin);
}

async function ensureDevUser(): Promise<void> {
  await db.insert(schema.users).values({
    id: DEV_USER_ID,
    name: "Dev Seeder",
    email: "dev-seeder@example.test",
    username: "dev-seeder",
    location: "Seattle, WA",
  }).onConflictDoUpdate({
    target: schema.users.id,
    set: {
      name: "Dev Seeder",
      email: "dev-seeder@example.test",
      username: "dev-seeder",
      location: "Seattle, WA",
    },
  });

  await db.insert(schema.userSettings).values({
    userId: DEV_USER_ID,
    theme: "green",
    gardenName: "Dev Garden",
    location: "Seattle, WA",
  }).onConflictDoNothing();
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!isDevAuthEnabled()) {
    return NextResponse.json({ error: "Development auth is not enabled." }, { status: 404 });
  }

  const requestUrl = new URL(request.url);
  const expectedToken = process.env.DEV_AUTH_TOKEN;
  const token = requestUrl.searchParams.get("token");

  if (!expectedToken || token !== expectedToken) {
    return NextResponse.json({ error: "Invalid development auth token." }, { status: 403 });
  }

  try {
    await ensureDevUser();

    const sessionToken = `${randomUUID()}${randomUUID()}`.replaceAll("-", "");
    const expires = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

    await db.delete(schema.sessions).where(eq(schema.sessions.userId, DEV_USER_ID));
    await db.insert(schema.sessions).values({
      sessionToken,
      userId: DEV_USER_ID,
      expires,
    });

    const response = NextResponse.redirect(getSafeCallbackUrl(requestUrl));
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionToken,
      expires,
      httpOnly: true,
      sameSite: "lax",
      secure: requestUrl.protocol === "https:",
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    console.error("GET /api/dev-auth/login failed:", err);
    const message = err instanceof Error ? err.message : "Failed to create development session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
