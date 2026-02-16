"use client";

import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark";

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "light";
    return (localStorage.getItem("tts-dashboard-theme") as ThemeMode | null) ?? "light";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", mode === "dark");
  }, [mode]);

  const toggle = () => {
    const next: ThemeMode = mode === "light" ? "dark" : "light";
    setMode(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("tts-dashboard-theme", next);
  };

  return (
    <button
      onClick={toggle}
      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
    >
      {mode === "light" ? "Dark mode" : "Light mode"}
    </button>
  );
}

