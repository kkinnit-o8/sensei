"use client";
/**
 * Per-device audio modes, kept in localStorage (like the voice choice), so the phone can be
 * silent while the computer isn't.
 *
 * - Silent mode: for when you can't listen (bus, office). No sound plays, audio buttons are
 *   hidden and listening questions in the quiz show pinyin to read instead.
 * - Speaking mode: a hands-free chat. The teacher's replies are read aloud, then the
 *   microphone starts, and what you say is sent when you pause.
 *
 * The two exclude each other: turning one on turns the other off.
 */
import { useSyncExternalStore } from "react";

const SILENT = "silent";
const SPEAKING = "speakingMode";
const listeners = new Set<() => void>();

function read(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function write(key: string, on: boolean) {
  try {
    if (on) localStorage.setItem(key, "1");
    else localStorage.removeItem(key);
  } catch {
    /* storage unavailable: the switch just won't stick */
  }
}

function notify() {
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  // Follow changes made in another tab.
  const onStorage = (e: StorageEvent) => (e.key === SILENT || e.key === SPEAKING) && cb();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export const isSilent = () => read(SILENT);
export const isSpeakingMode = () => read(SPEAKING);

export function setSilent(on: boolean) {
  write(SILENT, on);
  if (on) {
    write(SPEAKING, false);
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }
  notify();
}

export function setSpeakingMode(on: boolean) {
  write(SPEAKING, on);
  if (on) write(SILENT, false);
  notify();
}

export function useSilent(): [boolean, (on: boolean) => void] {
  return [useSyncExternalStore(subscribe, isSilent, () => false), setSilent];
}

export function useSpeakingMode(): [boolean, (on: boolean) => void] {
  return [useSyncExternalStore(subscribe, isSpeakingMode, () => false), setSpeakingMode];
}
