import { NextResponse } from "next/server";
import {
  getRequestOrigin,
  getSafeCallbackUrl,
  SESSION_COOKIE_NAMES,
  validateDevAuthToken,
} from "@/app/api/dev-auth/shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const tokenError = validateDevAuthToken(requestUrl);

  if (tokenError) {
    return tokenError;
  }

  const requestOrigin = getRequestOrigin(request, requestUrl);
  const response = NextResponse.redirect(getSafeCallbackUrl(requestUrl, requestOrigin, "/login"));

  for (const name of SESSION_COOKIE_NAMES) {
    response.cookies.set({
      name,
      value: "",
      expires: new Date(0),
      httpOnly: true,
      sameSite: "lax",
      secure: requestOrigin.startsWith("https://"),
      path: "/",
    });
  }

  return response;
}
