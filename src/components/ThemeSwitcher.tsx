"use client";

import { useState, useEffect } from "react";

type Theme = "green" | "earth" | "ocean";

const themes: { id: Theme; label: string; emoji: string }[] = [
  { id: "green", label: "Garden", emoji: "🌿" },
  { id: "earth", label: "Earth", emoji: "🌾" },
  { id: "ocean", label: "Ocean", emoji: "🌊" },
];

export function ThemeSwitcher() {
  const [activeTheme, setActiveTheme] = useState<Theme>("green");

  useEffect(() => {
    const saved = localStorage.getItem("kaylas-garden-theme") as Theme | null;
    if (saved && themes.some((t) => t.id === saved)) {
      setActiveTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    }
  }, []);

  const handleThemeChange = (theme: Theme) => {
    setActiveTheme(theme);
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("kaylas-garden-theme", theme);
  };

  return (
    <div className="flex items-center gap-1">
      {themes.map((theme) => (
        <button
          key={theme.id}
          onClick={() => handleThemeChange(theme.id)}
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
