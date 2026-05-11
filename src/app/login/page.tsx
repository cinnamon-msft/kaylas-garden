import { Suspense } from "react";
import { isDevAuthEnabled } from "@/app/api/dev-auth/shared";
import { getDevProfileEntries } from "@/lib/dev-auth-profiles";
import { GithubSignInButton } from "./github-signin-button";
import { LoginCallbackReader } from "./login-callback-reader";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { callbackUrl: rawCallback } = await searchParams;
  const callbackUrl =
    rawCallback && rawCallback.startsWith("/") && !rawCallback.startsWith("//")
      ? rawCallback
      : "/";

  const devAuthEnabled = isDevAuthEnabled();
  const devAuthToken = process.env["DEV_AUTH_TOKEN"];
  const devProfiles = devAuthEnabled && devAuthToken ? getDevProfileEntries() : [];

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-bg-card p-8 shadow-md">
        <div className="mb-6 text-center">
          <span className="text-5xl">🌱</span>
          <h1 className="mt-3 text-2xl font-bold text-text-primary">
            The Seed Feed
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Track your plants, share your garden, and grow with fellow seeders.
          </p>
        </div>

        <Suspense fallback={null}>
          <LoginCallbackReader />
        </Suspense>

        <GithubSignInButton callbackUrl={callbackUrl} />

        {devProfiles.length > 0 && devAuthToken ? (
          <div className="mt-6">
            <div className="mb-3 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs uppercase tracking-wide text-text-secondary">
                Dev only
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="space-y-2">
              {devProfiles.map(([key, profile]) => {
                const params = new URLSearchParams({
                  token: devAuthToken,
                  profile: key,
                  callbackUrl,
                });
                const href = `/api/dev-auth/login?${params.toString()}`;
                return (
                  <a
                    key={key}
                    href={href}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-bg-card px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-subtle"
                  >
                    Sign in as {profile.name}
                  </a>
                );
              })}
            </div>
            <p className="mt-3 text-center text-xs text-text-secondary">
              GitHub OAuth requires real credentials in <code>GITHUB_ID</code> /
              <code> GITHUB_SECRET</code>.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
