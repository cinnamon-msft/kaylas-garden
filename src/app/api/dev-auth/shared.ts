import { NextResponse } from "next/server";

export const SESSION_COOKIE_NAMES = ["authjs.session-token", "__Secure-authjs.session-token"] as const;

export function isDevAuthEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.DEV_AUTH_ENABLED === "true";
}

function getForwardedHeader(headers: Headers, name: string): string | undefined {
  return headers.get(name)?.split(",")[0]?.trim() || undefined;
}

export function getRequestOrigin(request: Request, requestUrl: URL): string {
  const forwardedHost = getForwardedHeader(request.headers, "x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");
  const forwardedProto = getForwardedHeader(request.headers, "x-forwarded-proto");
  const protocol = forwardedProto === "http" || forwardedProto === "https"
    ? forwardedProto
    : requestUrl.protocol.replace(":", "");

  if (!host) {
    return requestUrl.origin;
  }

  try {
    return new URL(`${protocol}://${host}`).origin;
  } catch {
    return requestUrl.origin;
  }
}

export function getSafeCallbackUrl(requestUrl: URL, requestOrigin: string, defaultPath = "/"): URL {
  const callbackUrl = requestUrl.searchParams.get("callbackUrl") || defaultPath;
  const fallback = new URL(defaultPath, requestOrigin);

  if (!callbackUrl.startsWith("/") || callbackUrl.startsWith("//")) {
    return fallback;
  }

  return new URL(callbackUrl, requestOrigin);
}

export function validateDevAuthToken(requestUrl: URL): NextResponse | undefined {
  if (!isDevAuthEnabled()) {
    return NextResponse.json({ error: "Development auth is not enabled." }, { status: 404 });
  }

  const expectedToken = process.env.DEV_AUTH_TOKEN;
  const token = requestUrl.searchParams.get("token");

  if (!expectedToken || token !== expectedToken) {
    return NextResponse.json({ error: "Invalid development auth token." }, { status: 403 });
  }

  return undefined;
}
