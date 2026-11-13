"use client";
/**
 * Silent mode: for when you can't listen (on the bus, in an office). Kept per device in
 * localStorage, like the voice choice, so the phone can be silent while the computer isn't.
 * While it's on, no sound plays, audio buttons are hidden and listening questions in the
 * quiz show pinyin to read instead.
 */
import { useSyncExternalStore } from "react";

const KEY = "silent";
const listeners = new Set<() => void>();

export function isSilent(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setSilent(on: boolean) {
  try {
    if (on) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: the switch just won't stick */
  }
  if (on && typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  // Follow changes made in another tab.
  const onStorage = (e: StorageEvent) => e.key === KEY && cb();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useSilent(): [boolean, (on: boolean) => void] {
  const silent = useSyncExternalStore(subscribe, isSilent, () => false);
  return [silent, setSilent];
}
