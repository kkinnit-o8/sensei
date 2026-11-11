"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Settings } from "@/lib/settings";

interface AppState {
  settings: Settings;
  learned: Set<string>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  /** Mark words as learned locally (the server is updated by the caller). */
  addLearned: (words: string[]) => void;
  setLearned: (words: string[]) => void;
}

const Ctx = createContext<AppState | null>(null);

export function applyTheme(theme: Settings["theme"]) {
  try {
    localStorage.setItem("theme", theme);
  } catch {
    /* storage unavailable */
  }
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}

export function AppProvider({
  initialSettings,
  initialLearned,
  children,
}: {
  initialSettings: Settings;
  initialLearned: string[];
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [learned, setLearnedState] = useState(() => new Set(initialLearned));

  // A router.refresh() re-renders the server layout with fresh data: adopt it.
  const serverKey = initialLearned.join(",") + "|" + JSON.stringify(initialSettings);
  const [seenKey, setSeenKey] = useState(serverKey);
  if (serverKey !== seenKey) {
    setSeenKey(serverKey);
    setLearnedState(new Set(initialLearned));
    setSettings(initialSettings);
  }

  useEffect(() => {
    applyTheme(settings.theme);
    if (settings.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [settings.theme]);

  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...patch }));
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) setSettings(await res.json());
  }, []);

  const addLearned = useCallback((words: string[]) => {
    setLearnedState((prev) => {
      const next = new Set(prev);
      words.forEach((w) => next.add(w));
      return next;
    });
  }, []);
  const setLearned = useCallback((words: string[]) => setLearnedState(new Set(words)), []);

  const value = useMemo(
    () => ({ settings, learned, updateSettings, addLearned, setLearned }),
    [settings, learned, updateSettings, addLearned, setLearned],
  );
  return (
    <Ctx.Provider value={value}>
      <div className={settings.toneColors ? "" : "tones-off"}>{children}</div>
    </Ctx.Provider>
  );
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside AppProvider");
  return v;
}
