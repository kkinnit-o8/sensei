"use client";
/** Text-to-speech with the browser's Web Speech API and a Mandarin (zh-CN) voice. */
import { useEffect, useState } from "react";
import { isSilent } from "./modes";

function supported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function chineseVoices(): SpeechSynthesisVoice[] {
  if (!supported()) return [];
  const voices = window.speechSynthesis.getVoices();
  const zh = voices.filter((v) => /^(zh|cmn)/i.test(v.lang));
  // Prefer mainland Mandarin, then other Chinese voices; local voices work offline.
  const score = (v: SpeechSynthesisVoice) =>
    (/zh[-_]CN|cmn/i.test(v.lang) ? 0 : /zh[-_]TW/i.test(v.lang) ? 1 : 2) * 10 + (v.localService ? 0 : 1) - (/premium|enhanced|natural/i.test(v.name) ? 0.5 : 0);
  return zh.sort((a, b) => score(a) - score(b));
}

/** The chosen voice is kept per device (browsers have different voices), in localStorage. */
export function preferredVoice(): string | null {
  try {
    return localStorage.getItem("voice");
  } catch {
    return null;
  }
}

export function setPreferredVoice(name: string | null) {
  try {
    if (name) localStorage.setItem("voice", name);
    else localStorage.removeItem("voice");
  } catch {
    /* storage unavailable */
  }
}

// Keep a reference to the utterance: some browsers drop `onend` if it is garbage-collected.
let current: SpeechSynthesisUtterance | null = null;

/**
 * Say `text` with a Mandarin voice. Returns true if speech started; `onEnd` is then called once
 * when it finishes (or fails). Does nothing in silent mode.
 */
export function speak(text: string, rate = 0.9, onEnd?: () => void): boolean {
  if (!supported() || !text || isSilent()) return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  const voices = chineseVoices();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "zh-CN";
  u.rate = rate;
  const name = preferredVoice();
  const voice = voices.find((v) => v.name === name) ?? voices[0];
  if (voice) u.voice = voice;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    if (current === u) current = null;
    onEnd?.();
  };
  u.onend = finish;
  u.onerror = (e) => {
    // Cut off by newer speech: not "finished", so nothing chained to it runs.
    if (e.error === "interrupted" || e.error === "canceled") {
      done = true;
      if (current === u) current = null;
      return;
    }
    finish();
  };
  current = u;
  synth.speak(u);
  return true;
}

export function stopSpeaking() {
  if (supported()) window.speechSynthesis.cancel();
}

/** Re-renders when the browser finishes loading its voice list. */
export function useChineseVoices(): { voices: SpeechSynthesisVoice[]; ready: boolean; supported: boolean } {
  const [state, setState] = useState<{ voices: SpeechSynthesisVoice[]; ready: boolean }>({ voices: [], ready: false });
  useEffect(() => {
    if (!supported()) return;
    const update = () => setState({ voices: chineseVoices(), ready: true });
    const t = setTimeout(update, 0);
    // Some browsers fill the list asynchronously.
    const late = setTimeout(update, 1500);
    window.speechSynthesis.addEventListener("voiceschanged", update);
    return () => {
      clearTimeout(t);
      clearTimeout(late);
      window.speechSynthesis.removeEventListener("voiceschanged", update);
    };
  }, []);
  return { ...state, supported: supported() };
}
