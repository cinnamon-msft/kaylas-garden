import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import {
  getRequestOrigin,
  getSafeCallbackUrl,
  SESSION_COOKIE_NAMES,
  validateDevAuthToken,
} from "@/app/api/dev-auth/shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SESSION_DURATION_DAYS = 30;

const devProfiles = {
  local: {
    id: "dev-feeder",
    name: "Dev Feeder",
    email: "dev-feeder@example.test",
    username: "dev-feeder",
    gardenName: "Dev Feeder's Garden",
  },
  remote: {
    id: "remote-feeder",
    name: "Remote Feeder",
    email: "remote-feeder@example.test",
    username: "remote-feeder",
    gardenName: "Remote Feeder's Garden",
  },
} as const;

type DevProfile = (typeof devProfiles)[keyof typeof devProfiles];
type DevProfileKey = keyof typeof devProfiles;

function getDevProfile(requestUrl: URL): DevProfile | undefined {
  const requestedProfile = requestUrl.searchParams.get("profile") || "local";

  if (requestedProfile === "local" || requestedProfile === "remote") {
    return devProfiles[requestedProfile satisfies DevProfileKey];
  }

  return undefined;
}

async function ensureDevUser(profile: DevProfile): Promise<void> {
  await db.insert(schema.users).values({
    id: profile.id,
    name: profile.name,
    email: profile.email,
    username: profile.username,
    location: "Seattle, WA",
  }).onConflictDoUpdate({
    target: schema.users.id,
    set: {
      name: profile.name,
      email: profile.email,
      username: profile.username,
      location: "Seattle, WA",
    },
  });

  await db.insert(schema.userSettings).values({
    userId: profile.id,
    theme: "green",
    gardenName: profile.gardenName,
    location: "Seattle, WA",
  }).onConflictDoNothing();
}

export async function GET(request: Request): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const tokenError = validateDevAuthToken(requestUrl);
  const profile = getDevProfile(requestUrl);

  if (tokenError) {
    return tokenError;
  }

  if (!profile) {
    return NextResponse.json({ error: "Invalid development auth profile." }, { status: 400 });
  }

  try {
    await ensureDevUser(profile);

    const sessionToken = `${randomUUID()}${randomUUID()}`.replaceAll("-", "");
    const expires = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

    await db.delete(schema.sessions).where(eq(schema.sessions.userId, profile.id));
    await db.insert(schema.sessions).values({
      sessionToken,
      userId: profile.id,
      expires,
    });

    const requestOrigin = getRequestOrigin(request, requestUrl);
    const response = NextResponse.redirect(getSafeCallbackUrl(requestUrl, requestOrigin));

    for (const name of SESSION_COOKIE_NAMES) {
      response.cookies.set({
        name,
        value: sessionToken,
        expires,
        httpOnly: true,
        sameSite: "lax",
        secure: requestOrigin.startsWith("https://"),
        path: "/",
      });
    }

    return response;
  } catch (err: unknown) {
    console.error("GET /api/dev-auth/login failed:", err);
    const message = err instanceof Error ? err.message : "Failed to create development session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
