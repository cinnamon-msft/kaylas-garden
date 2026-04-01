"use client";

import { useEffect } from "react";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const saved = localStorage.getItem("kaylas-garden-theme");
    if (saved) {
      document.documentElement.setAttribute("data-theme", saved);
    }
  }, []);

  return <>{children}</>;
}
