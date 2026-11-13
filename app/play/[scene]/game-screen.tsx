"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { GameStage, type StageActor } from "@/components/game/GameStage";
import { MessageInput } from "@/components/chat/MessageInput";
import { NewWords } from "@/components/chat/NewWords";
import { TonePinyin, ZhText } from "@/components/ZhText";
import { Button } from "@/components/ui";
import { speak, stopSpeaking } from "@/lib/client/speech";
import { useSpeechInput } from "@/lib/client/listen";
import { useSpeakingMode } from "@/lib/client/modes";
import { CHARACTERS, MAX_HEARTS, sceneById, type Expression } from "@/lib/game/scenes";
import type { GameMessageView, RunView } from "@/lib/server/game-view";
import type { MissionBriefing } from "@/lib/server/game-page";

type GameError = { kind: string; message: string } | null;

const ERROR_HELP: Record<string, string> = {
  no_key: "Add OPENROUTER_API_KEY=… to .env.local in the app folder, then restart the app.",
  auth: "Check that the key in .env.local is correct and still active on openrouter.ai.",
  credits: "Add credits on openrouter.ai, then retry.",
  network: "Check your internet connection. The game needs it to talk to the AI characters.",
};

const lastNpcId = (r: RunView | null) => [...(r?.messages ?? [])].reverse().find((m) => m.role === "npc")?.id ?? 0;

export function GameScreen({ sceneId, briefings, initialRun }: { sceneId: string; briefings: MissionBriefing[]; initialRun: RunView | null }) {
  const scene = sceneById(sceneId)!;
  const { settings } = useApp();
  const [run, setRun] = useState<RunView | null>(initialRun);
  const [error, setError] = useState<GameError>(initialRun?.awaitingReply ? { kind: "pending", message: "The characters haven't answered yet." } : null);
  const [busy, setBusy] = useState(false);
  const [missionId, setMissionId] = useState(() => briefings.find((b) => !b.best)?.id ?? briefings[0].id);
  const [text, setText] = useState("");
  const [talking, setTalking] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [speakingMode, setSpeakingMode] = useSpeakingMode();
  const spokenUpTo = useRef(lastNpcId(initialRun));
  const playToken = useRef(0);

  // What to do with recognised speech: send it in speaking mode, otherwise put it in the box.
  const onHeard = useRef<(heard: string) => void>(() => {});
  const mic = useSpeechInput((heard) => onHeard.current(heard));
  const startListening = mic.start;

  // Stop talking when leaving the page.
  useEffect(
    () => () => {
      playToken.current++;
      stopSpeaking();
    },
    [],
  );

  /** Say the new lines one after another, each in the character's own voice, moving their mouth. */
  function play(view: RunView, lines: GameMessageView[], thenListen: boolean) {
    const token = ++playToken.current;
    const step = (i: number) => {
      if (token !== playToken.current) return;
      if (i >= lines.length) {
        setTalking(null);
        if (thenListen && speakingMode && !view.finished && mic.availability === "ok") startListening();
        return;
      }
      const line = lines[i];
      const ch = CHARACTERS[line.speaker ?? ""];
      setTalking(line.speaker);
      const next = () => step(i + 1);
      const voice = settings.autoSpeak || speakingMode || !thenListen;
      const spoken = voice && ch ? speak(line.text, settings.audioRate * ch.voice.rate, next, ch.voice.pitch) : false;
      if (!spoken) setTimeout(next, Math.min(3500, 600 + Array.from(line.text).length * 110));
    };
    step(0);
  }

  async function call(url: string, body?: unknown) {
    setBusy(true);
    setError(null);
    const heartsBefore = run?.hearts ?? MAX_HEARTS;
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      const d = (await res.json()) as { view?: RunView | null; error?: GameError };
      if (d.view) {
        const view = d.view;
        setRun(view);
        setShowTranslation(false);
        setShowHint(false);
        if (view.hearts < heartsBefore) {
          const lastPlayer = [...view.messages].reverse().find((m) => m.role === "player");
          const who = CHARACTERS[view.messages.find((m) => m.role === "npc")?.speaker ?? ""]?.hanzi ?? "They";
          setToast(lastPlayer?.notChinese ? `${who} doesn't understand English. Try Chinese or pinyin! −1 ❤` : `${who} is losing patience. −1 ❤`);
          setTimeout(() => setToast(null), 3500);
        }
        const fresh = view.messages.filter((m) => m.role === "npc" && !m.raw && m.id > spokenUpTo.current);
        if (fresh.length) {
          spokenUpTo.current = fresh[fresh.length - 1].id;
          play(view, fresh, true);
        }
      }
      setError(d.error ?? (res.ok ? null : { kind: "server", message: "Something went wrong." }));
      return res.ok && !d.error;
    } catch {
      setError({ kind: "network", message: "Couldn't reach the app's server." });
      return false;
    } finally {
      setBusy(false);
    }
  }

  function sendText(raw: string) {
    const t = raw.trim();
    if (!t || !run || busy || run.awaitingReply || run.finished) return;
    setText("");
    void call(`/api/game/runs/${run.id}/turn`, { text: t });
  }

  useEffect(() => {
    onHeard.current = (heard) => {
      if (speakingMode) sendText(heard);
      else setText(text ? `${text}${heard}` : heard);
    };
  });

  function start(id = missionId) {
    spokenUpTo.current = 0;
    void call("/api/game/runs", { sceneId, missionId: id });
  }

  async function leave() {
    if (run && !run.finished) await fetch(`/api/game/runs/${run.id}/leave`, { method: "POST" });
    playToken.current++;
    stopSpeaking();
    setRun(null);
    setError(null);
  }

  async function openHint(m: GameMessageView) {
    setShowHint(true);
    if (!run || m.hintUsed) return;
    const res = await fetch(`/api/game/runs/${run.id}/hint`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageId: m.id }) });
    const d = (await res.json().catch(() => ({}))) as { view?: RunView };
    if (d.view) setRun(d.view);
  }

  /* ------------------------------ briefing ------------------------------ */

  if (!run || (run.finished && !run.complete)) {
    const mission = scene.missions.find((m) => m.id === missionId)!;
    const brief = briefings.find((b) => b.id === missionId)!;
    return (
      <div className="space-y-4">
        <Link href="/play" className="text-sm text-accent underline">
          ← All places
        </Link>
        <div className="overflow-hidden rounded-3xl border border-border bg-surface">
          <GameStage sceneId={sceneId} actors={mission.cast.map((id) => ({ id, expression: "happy", talking: false }))}>
            <div className="absolute top-3 left-3 z-[4] rounded-2xl bg-surface/90 px-4 py-2 shadow-sm backdrop-blur">
              <div className="text-lg font-semibold">
                {scene.emoji} {scene.name} <span className="zh font-normal text-muted">{scene.hanzi}</span>
              </div>
            </div>
          </GameStage>
          <div className="space-y-4 p-5">
            {scene.missions.length > 1 ? (
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Missions">
                {scene.missions.map((m) => {
                  const b = briefings.find((x) => x.id === m.id)!;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="tab"
                      aria-selected={m.id === missionId}
                      onClick={() => setMissionId(m.id)}
                      className={`rounded-full border px-3 py-1.5 text-sm ${m.id === missionId ? "border-accent bg-accent-soft text-accent" : "border-border text-muted hover:text-text"}`}
                    >
                      {m.title} <Stars n={b.best} small />
                    </button>
                  );
                })}
              </div>
            ) : null}
            <div>
              <div className="text-xs font-medium tracking-wide text-accent uppercase">Your mission</div>
              <h1 className="text-2xl font-semibold">{mission.title}</h1>
              <p className="mt-1">{mission.brief}</p>
            </div>
            <ul className="space-y-1">
              {mission.goals.map((g) => (
                <li key={g.id} className="flex items-center gap-2 text-sm">
                  <span className="h-4 w-4 rounded border border-border" aria-hidden /> {g.text}
                </li>
              ))}
            </ul>
            <div>
              <div className="mb-2 text-sm font-medium">Useful words</div>
              <ul className="flex flex-wrap gap-2">
                {brief.keyWords.map((k) => (
                  <li key={k.word} className={`rounded-xl border px-3 py-1.5 text-sm ${k.known ? "border-ok bg-ok-soft" : "border-border bg-surface-2"}`}>
                    <span className="zh text-base">{k.word}</span> <TonePinyin num={k.pinyinNum} /> <span className="text-muted">{k.meaning}</span>
                    <span className={`ml-1 text-xs ${k.known ? "text-ok" : "text-accent"}`}>{k.known ? "known" : "new"}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-muted">
              {mission.cast.map((id) => (
                <span key={id}>
                  <span className="zh text-text">{CHARACTERS[id].hanzi}</span> {CHARACTERS[id].name} · {CHARACTERS[id].role}
                </span>
              ))}
            </div>
            <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
              Talk in Chinese characters or pinyin. You have 3 ❤ of patience: writing in English costs one. Stars: finish the mission ★, keep
              them patient ★, use at most one hint ★.
            </p>
            {error ? <ErrorBox error={error} /> : null}
            <Button onClick={() => start()} disabled={busy} className="w-full py-3 text-base">
              {busy ? "Walking in…" : "Start the mission"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------- playing ------------------------------- */

  const mission = scene.missions.find((m) => m.id === run.missionId)!;
  const latestTurn = Math.max(-1, ...run.messages.filter((m) => m.role === "npc").map((m) => m.turn));
  const lines = run.messages.filter((m) => m.role === "npc" && m.turn === latestTurn);
  const hintLine = [...lines].reverse().find((m) => m.hint);
  const lastPlayer = [...run.messages].reverse().find((m) => m.role === "player");
  const lastNpc = lines[lines.length - 1];
  const expressionOf = (id: string): Expression => {
    if (run.complete) return "happy";
    return [...run.messages].reverse().find((m) => m.role === "npc" && m.speaker === id)?.expression ?? "neutral";
  };
  const actors: StageActor[] = mission.cast.map((id) => ({ id, expression: expressionOf(id), talking: talking === id }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={leave} className="text-sm text-accent underline">
          ← Leave {scene.name.toLowerCase()}
        </button>
        <div className="flex items-center gap-3">
          {mic.availability === "ok" && !run.finished ? (
            <button
              type="button"
              onClick={() => {
                setSpeakingMode(!speakingMode);
                if (!speakingMode && !busy && !run.awaitingReply) startListening();
                else mic.stop();
              }}
              aria-pressed={speakingMode}
              className={`rounded-full border px-3 py-1 text-xs ${speakingMode ? "border-accent bg-accent text-accent-text" : "border-border text-muted"}`}
            >
              🎙 Speaking mode {speakingMode ? "on" : "off"}
            </button>
          ) : null}
          <span className="text-lg" aria-label={`Patience: ${run.hearts} of ${run.maxHearts} hearts`} title="Patience">
            {Array.from({ length: run.maxHearts }, (_, i) => (
              <span key={i} className={i < run.hearts ? "text-danger" : "text-muted opacity-40"}>
                ♥
              </span>
            ))}
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-3">
          <div className="overflow-hidden rounded-3xl border border-border bg-surface">
            <GameStage sceneId={sceneId} actors={actors} speaker={talking ?? lastNpc?.speaker}>
              {toast ? (
                <div className="animate-fade-in absolute top-3 left-1/2 z-[5] -translate-x-1/2 rounded-full bg-danger px-4 py-2 text-sm font-medium text-white shadow" role="status">
                  {toast}
                </div>
              ) : null}
              {run.complete ? <Results run={run} onAgain={() => start(nextMission(scene.missions.map((m) => m.id), run.missionId))} /> : null}
            </GameStage>

            {/* dialogue box */}
            <div className="space-y-3 border-t border-border p-4">
              {lastPlayer && lastPlayer.turn === latestTurn ? (
                <div className="ml-auto w-fit max-w-[90%] space-y-1">
                  <div className="rounded-2xl rounded-tr-sm bg-accent-soft px-3 py-2">
                    <span className="mr-2 text-xs text-muted">You</span>
                    <ZhText text={lastPlayer.text} tokens={lastPlayer.tokens} size="md" />
                  </div>
                  {lastPlayer.correction ? (
                    <div className="rounded-xl border border-warn bg-warn-soft px-3 py-2 text-sm">
                      <span className="font-medium text-warn">✎ </span>
                      {lastPlayer.correction.explanation}
                      {lastPlayer.correction.corrected ? (
                        <div className="mt-1">
                          <ZhText text={lastPlayer.correction.corrected} tokens={lastPlayer.correction.correctedTokens ?? undefined} size="md" />
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {lines.map((m) => {
                const ch = CHARACTERS[m.speaker ?? ""];
                return (
                  <div key={m.id} className="flex gap-3">
                    <span
                      className="zh mt-1 h-fit shrink-0 rounded-lg px-2 py-0.5 text-sm text-white"
                      style={{ background: ch?.look.outfit.main ?? "var(--accent)" }}
                      title={ch ? `${ch.name}, ${ch.role}` : undefined}
                    >
                      {ch?.hanzi ?? "?"}
                    </span>
                    <div className="min-w-0">
                      {m.raw ? (
                        <p className="text-sm text-warn">(The reply couldn&apos;t be read properly) {m.text}</p>
                      ) : (
                        <ZhText text={m.text} tokens={m.tokens} size="lg" />
                      )}
                      {showTranslation && m.translation ? <p className="text-sm text-muted">{m.translation}</p> : null}
                    </div>
                  </div>
                );
              })}
              {busy ? <p className="text-sm text-muted">…</p> : null}
              {lines.length && !run.complete ? (
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <button type="button" onClick={() => setShowTranslation((s) => !s)} className="rounded-full border border-border px-3 py-1.5 hover:bg-surface-2" aria-pressed={showTranslation}>
                    {showTranslation ? "Hide translation" : "Translate"}
                  </button>
                  <button type="button" onClick={() => play(run, lines, false)} className="rounded-full border border-border px-3 py-1.5 hover:bg-surface-2">
                    ▶ Again
                  </button>
                  {hintLine ? (
                    <button
                      type="button"
                      onClick={() => openHint(hintLine)}
                      title="Using more than one hint in a mission costs a star"
                      className="rounded-full border border-border px-3 py-1.5 hover:bg-surface-2"
                    >
                      Hint
                    </button>
                  ) : null}
                </div>
              ) : null}
              {showHint && hintLine?.hint ? (
                <div className="animate-fade-in flex items-start justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2">
                  <div>
                    <div className="text-xs text-muted">You could say:</div>
                    <ZhText text={hintLine.hint} tokens={hintLine.hintTokens ?? undefined} size="md" />
                  </div>
                </div>
              ) : null}
              {error && !busy ? <ErrorBox error={error} onRetry={run.awaitingReply ? () => call(`/api/game/runs/${run.id}/retry`) : undefined} /> : null}
            </div>
          </div>

          {!run.finished ? (
            <MessageInput
              text={text}
              setText={setText}
              onSend={() => sendText(text)}
              disabled={busy || run.awaitingReply}
              mic={mic}
              placeholder={`Talk to ${mission.cast.map((id) => CHARACTERS[id].hanzi).join(" / ")} in characters or pinyin…`}
            />
          ) : null}

          <details className="rounded-2xl border border-border bg-surface p-4">
            <summary className="cursor-pointer text-sm font-medium">Conversation log</summary>
            <ol className="mt-3 space-y-2">
              {run.messages.map((m) => (
                <li key={m.id} className="flex gap-2 text-sm">
                  <span className="zh w-12 shrink-0 text-muted">{m.role === "player" ? "You" : (CHARACTERS[m.speaker ?? ""]?.hanzi ?? "")}</span>
                  <span className="min-w-0">
                    <ZhText text={m.text} tokens={m.tokens} size="sm" />
                    {m.translation ? <span className="block text-xs text-muted">{m.translation}</span> : null}
                  </span>
                </li>
              ))}
            </ol>
          </details>
        </div>

        <aside className="order-first space-y-3 lg:sticky lg:top-20 lg:order-none lg:self-start">
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="text-xs font-medium tracking-wide text-accent uppercase">Mission</div>
            <div className="font-semibold">{mission.title}</div>
            <ul className="mt-2 space-y-1.5" aria-label="Mission goals">
              {run.goals.map((g) => (
                <li key={g.id} className={`flex items-start gap-2 text-sm ${g.done ? "text-ok" : ""}`}>
                  <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[11px] ${g.done ? "border-ok bg-ok text-white" : "border-border"}`} aria-hidden>
                    {g.done ? "✓" : ""}
                  </span>
                  <span className={g.done ? "line-through decoration-ok/50" : ""}>{g.text}</span>
                  <span className="sr-only">{g.done ? "(done)" : "(to do)"}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 text-xs text-muted">
              Hints used: {run.hints}
              {run.cost > 0 ? ` · cost ≈ $${run.cost.toFixed(4)}` : ""}
            </div>
          </div>
          <NewWords
            title="New words here"
            description="Words the characters used that you haven't learned. Add one to learn it first tomorrow."
            words={run.wordsFromGame}
            open={false}
            onQueued={(w) => setRun((r) => (r ? { ...r, wordsFromGame: r.wordsFromGame.map((x) => (x.simplified === w ? { ...x, queued: true } : x)) } : r))}
          />
        </aside>
      </div>
    </div>
  );
}

function nextMission(ids: string[], current: string): string {
  return ids[(ids.indexOf(current) + 1) % ids.length];
}

function Stars({ n, small = false, max = 3 }: { n: number; small?: boolean; max?: number }) {
  return (
    <span className={small ? "text-xs" : "text-4xl"} aria-label={`${n} of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < n ? "text-warn" : "text-muted opacity-40"}>
          ★
        </span>
      ))}
    </span>
  );
}

function Results({ run, onAgain }: { run: RunView; onAgain: () => void }) {
  const s = run.stars;
  return (
    <div className="animate-fade-in absolute inset-0 z-[6] flex items-center justify-center bg-black/35 p-4">
      <div className="w-full max-w-sm space-y-3 rounded-3xl bg-surface p-6 text-center shadow-xl">
        <div className="zh text-sm text-muted">任务完成！</div>
        <div className="text-2xl font-semibold">Mission complete</div>
        <Stars n={s.total} />
        <ul className="space-y-1 text-left text-sm">
          <li>{s.complete ? "★" : "☆"} Finished the mission</li>
          <li className={s.patient ? "" : "text-muted"}>{s.patient ? "★" : "☆"} Kept them patient ({run.hearts} ❤ left)</li>
          <li className={s.fewHints ? "" : "text-muted"}>{s.fewHints ? "★" : "☆"} At most one hint ({run.hints} used)</li>
        </ul>
        <div className="flex flex-wrap justify-center gap-2 pt-1">
          <Button onClick={onAgain}>Next mission</Button>
          <Link href="/play" className="inline-flex items-center rounded-full border border-border px-5 py-2.5 text-sm font-medium">
            All places
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorBox({ error, onRetry }: { error: NonNullable<GameError>; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-danger bg-danger-soft p-3 text-sm" role="alert">
      <p className="font-medium text-danger">{error.message}</p>
      {ERROR_HELP[error.kind] ? <p className="mt-1">{ERROR_HELP[error.kind]}</p> : null}
      {onRetry ? (
        <Button variant="secondary" className="mt-2" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
