"use client";
/**
 * Speech input with the browser's speech recognition (Chrome, Edge, Safari). Mandarin (zh-CN).
 * Browsers only allow it on secure pages: http://localhost works, but a phone opening the app at
 * http://192.168.x.x does not (use the keyboard's microphone key there).
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { stopSpeaking } from "./speech";

interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: RecognitionAlternative;
}
interface RecognitionEvent {
  resultIndex: number;
  results: { length: number; [index: number]: RecognitionResult };
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type SpeechInputAvailability = "unknown" | "ok" | "unsupported" | "insecure";

function availability(): SpeechInputAvailability {
  if (!recognitionCtor()) return "unsupported";
  if (!window.isSecureContext) return "insecure";
  return "ok";
}

const ERRORS: Record<string, string | null> = {
  "not-allowed": "Microphone access was blocked. Allow the microphone for this site in your browser, then try again.",
  "service-not-allowed": "Microphone access was blocked. Allow the microphone for this site in your browser, then try again.",
  "no-speech": "I didn't hear anything. Tap the microphone and try again.",
  "audio-capture": "No microphone was found.",
  network: "Speech recognition needs an internet connection (the browser sends the audio to its speech service).",
  "language-not-supported": "This browser can't recognise Mandarin.",
  aborted: null,
};

const noop = () => () => {};

/**
 * Listen once: `interim` shows the words while you speak, `onFinal` gets the text when you pause.
 */
export function useSpeechInput(onFinal: (text: string) => void) {
  const avail = useSyncExternalStore(noop, availability, () => "unknown" as const);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const onFinalRef = useRef(onFinal);
  useEffect(() => {
    onFinalRef.current = onFinal;
  });

  const start = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor || rec.current) return;
    stopSpeaking(); // don't record the teacher's voice
    const r = new Ctor();
    r.lang = "zh-CN";
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 1;
    let finalText = "";
    r.onresult = (e) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interimText += res[0].transcript;
      }
      setInterim(finalText + interimText);
    };
    r.onerror = (e) => {
      const msg = e.error in ERRORS ? ERRORS[e.error] : `Speech recognition failed (${e.error}).`;
      if (msg) setError(msg);
    };
    r.onend = () => {
      rec.current = null;
      setListening(false);
      setInterim("");
      const text = finalText.trim();
      if (text) onFinalRef.current(text);
    };
    rec.current = r;
    setError(null);
    setListening(true);
    try {
      r.start();
    } catch {
      rec.current = null;
      setListening(false);
      setError("Couldn't start the microphone.");
    }
  }, []);

  const stop = useCallback(() => rec.current?.stop(), []);
  const clearError = useCallback(() => setError(null), []);

  // Stop listening when the chat is closed or hidden.
  useEffect(() => () => rec.current?.abort(), []);

  return { availability: avail, listening, interim, error, start, stop, clearError };
}
