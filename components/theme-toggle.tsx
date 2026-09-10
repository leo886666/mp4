"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { THEME_KEY } from "@/lib/theme";

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch { /* ignore */ }
  }

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className={cn(
        "w-9 h-9 rounded-full flex items-center justify-center text-ink-soft hover:bg-wash transition-colors",
        className
      )}
    >
      {dark ? <Sun className="w-5 h-5" strokeWidth={2} /> : <Moon className="w-5 h-5" />}
    </button>
  );
}

/** Segmented variant used in Settings-style lists */
export function ThemeSwitch({ className }: { className?: string }) {
  const [mode, setMode] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    setMode(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  function set(next: "light" | "dark") {
    setMode(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch { /* ignore */ }
  }

  return (
    <div className={cn("inline-flex bg-wash rounded-full p-1", className)}>
      {([["light", Sun, "Light"], ["dark", Moon, "Dark"]] as const).map(([id, Icon, label]) => (
        <button
          key={id}
          onClick={() => set(id)}
          className={cn(
            "h-8 px-4 rounded-full text-[13px] font-medium inline-flex items-center gap-1.5 transition-all",
            mode === id ? "bg-paper text-ink shadow-card" : "text-ink-mute hover:text-ink"
          )}
        >
          <Icon className="w-4 h-4" strokeWidth={2} />
          {label}
        </button>
      ))}
    </div>
  );
}
