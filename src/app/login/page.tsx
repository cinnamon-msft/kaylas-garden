import { headers } from "next/headers";
import { isLoopbackHostHeader } from "@/app/api/dev-auth/shared";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}

function sanitizeCallback(raw: string | string[] | undefined): string {
  if (typeof raw !== "string") return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const callbackUrl = sanitizeCallback(params.callbackUrl);

  const headersList = await headers();
  const loopback = isLoopbackHostHeader(headersList.get("host"));
  const devAuthEnabled =
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_AUTH_ENABLED === "true";
  const devAuthToken = process.env.DEV_AUTH_TOKEN;

  let ghLoginHref: string | null = null;
  if (devAuthEnabled && devAuthToken && loopback) {
    const qs = new URLSearchParams({ token: devAuthToken, callbackUrl });
    ghLoginHref = `/api/dev-auth/gh-login?${qs.toString()}`;
  }

  return <LoginForm callbackUrl={callbackUrl} ghLoginHref={ghLoginHref} />;
}
