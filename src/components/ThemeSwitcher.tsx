"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import type { UserSettings } from "@/lib/types";

type Theme = "green" | "earth" | "ocean" | "space";

const themes: { id: Theme; label: string; emoji: string }[] = [
  { id: "green", label: "Garden", emoji: "🌿" },
  { id: "earth", label: "Earth", emoji: "🌾" },
  { id: "ocean", label: "Ocean", emoji: "🌊" },
  { id: "space", label: "Space", emoji: "🔮" },
];

export function ThemeSwitcher() {
  const { data: session } = useSession();
  const [activeTheme, setActiveTheme] = useState<Theme>("green");

  useEffect(() => {
    const saved = localStorage.getItem("kaylas-garden-theme") as Theme | null;
    if (saved && themes.some((t) => t.id === saved)) {
      setActiveTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    }
  }, []);

  useEffect(() => {
    if (!session?.user) return;

    fetch("/api/settings")
      .then((res) => res.ok ? res.json() : Promise.reject(new Error("Failed to load settings")))
      .then((settings: UserSettings) => {
        if (!themes.some((theme) => theme.id === settings.theme)) return;
        setActiveTheme(settings.theme);
        document.documentElement.setAttribute("data-theme", settings.theme);
        localStorage.setItem("kaylas-garden-theme", settings.theme);
      })
      .catch((err: unknown) => {
        console.error("Failed to load theme setting:", err);
      });
  }, [session?.user]);

  useEffect(() => {
    const handleThemeEvent = (event: Event) => {
      const theme = (event as CustomEvent<Theme>).detail;
      if (!themes.some((candidate) => candidate.id === theme)) return;
      setActiveTheme(theme);
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("kaylas-garden-theme", theme);
    };

    window.addEventListener("garden-theme-change", handleThemeEvent);
    return () => window.removeEventListener("garden-theme-change", handleThemeEvent);
  }, []);

  const handleThemeChange = async (theme: Theme) => {
    setActiveTheme(theme);
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("kaylas-garden-theme", theme);
    window.dispatchEvent(new CustomEvent("garden-theme-change", { detail: theme }));

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme }),
      });
      if (!res.ok) throw new Error("Failed to save theme");
    } catch (err) {
      console.error("Failed to save theme setting:", err);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {themes.map((theme) => (
        <button
          key={theme.id}
          onClick={() => void handleThemeChange(theme.id)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
            activeTheme === theme.id
              ? "bg-white/20 text-text-on-primary shadow-sm"
              : "text-text-on-primary/70 hover:bg-white/10"
          }`}
          aria-pressed={activeTheme === theme.id}
          aria-label={`${theme.label} theme`}
        >
          <span aria-hidden="true">{theme.emoji}</span>
        </button>
      ))}
    </div>
  );
}
