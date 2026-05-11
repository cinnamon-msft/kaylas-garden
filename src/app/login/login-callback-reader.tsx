"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Surfaces NextAuth `?error=...` codes that appear after a failed OAuth round
 * trip (e.g. when GitHub OAuth credentials are placeholders).
 */
export function LoginCallbackReader() {
  const params = useSearchParams();
  const error = params.get("error");

  useEffect(() => {
    if (error) {
      console.warn("Login error from query string:", error);
    }
  }, [error]);

  if (!error) {
    return null;
  }

  return (
    <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
      Sign-in failed ({error}). Try a dev profile below.
    </div>
  );
}
