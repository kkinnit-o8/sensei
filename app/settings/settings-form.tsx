"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/AppProvider";
import { Button, Card } from "@/components/ui";
import { ZhText } from "@/components/ZhText";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/settings";
import { SUGGESTED_MODELS } from "@/lib/models";
import { preferredVoice, setPreferredVoice, speak, useChineseVoices } from "@/lib/client/speech";

export function SettingsForm({ keyConfigured }: { keyConfigured: boolean }) {
  const { settings, updateSettings } = useApp();
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function save(patch: Partial<Settings>) {
    await updateSettings(patch);
    setSaved(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <span className={`text-sm text-ok transition-opacity ${saved ? "opacity-100" : "opacity-0"}`} aria-live="polite">
          Saved
        </span>
      </div>

      <Card className="space-y-4">
        <h2 className="font-semibold">Daily session</h2>
        <NumberField label="New words per day" value={settings.newWordsPerDay} min={0} max={50} def={DEFAULT_SETTINGS.newWordsPerDay} onChange={(v) => save({ newWordsPerDay: v })} />
        <NumberField label="Exchanges per day" hint="One of your messages plus one reply from the teacher." value={settings.exchangesPerDay} min={1} max={50} def={DEFAULT_SETTINGS.exchangesPerDay} onChange={(v) => save({ exchangesPerDay: v })} />
        <NumberField label="Maximum reviews per day" hint="Keeps a missed week from turning into a wall of reviews." value={settings.maxReviewsPerDay} min={0} max={1000} def={DEFAULT_SETTINGS.maxReviewsPerDay} onChange={(v) => save({ maxReviewsPerDay: v })} />
        <p className="text-xs text-muted">Changes apply from the next study day (or the next step you haven&apos;t started). The day rolls over at 04:00.</p>
      </Card>

      <ModelCard settings={settings} save={save} keyConfigured={keyConfigured} />

      <Card className="space-y-4">
        <h2 className="font-semibold">Display</h2>
        <Choice
          label="Pinyin"
          value={settings.toneStyle}
          options={[
            { value: "marks", label: "Tone marks (nǐ hǎo)" },
            { value: "numbers", label: "Tone numbers (ni3 hao3)" },
          ]}
          onChange={(v) => save({ toneStyle: v as Settings["toneStyle"] })}
        />
        <Toggle label="Tone colours" hint="Colour every syllable and character by its tone." checked={settings.toneColors} onChange={(v) => save({ toneColors: v })} />
        <div className="flex flex-wrap gap-3 rounded-xl bg-surface-2 p-3 text-sm">
          {[1, 2, 3, 4, 5].map((t) => (
            <span key={t} className={`tone-${t} font-medium`}>
              {t === 5 ? "neutral" : `tone ${t}`}
            </span>
          ))}
        </div>
        <Toggle label="Pinyin above every character" hint="Shows all words in characters with pinyin above (ruby), ignoring what you've learned. Also in the header (字)." checked={settings.ruby} onChange={(v) => save({ ruby: v })} />
        <Choice
          label="Theme"
          value={settings.theme}
          options={[
            { value: "system", label: "Like my device" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
          onChange={(v) => save({ theme: v as Settings["theme"] })}
        />
        <div className="rounded-xl border border-border p-3">
          <div className="mb-1 text-xs text-muted">Preview</div>
          <ZhText text="你今天吃了什么？" size="lg" alsoLearned={["你", "今天", "了", "什么"]} />
        </div>
      </Card>

      <AudioCard rate={settings.audioRate} save={save} />

      <BackupCard />

      <p className="text-sm text-muted">
        <Link href="/about" className="underline">
          About this app, data sources and licences
        </Link>{" "}
        · <Link href="/renderer" className="underline">Renderer playground</Link>
      </p>
    </div>
  );
}

function ModelCard({ settings, save, keyConfigured }: { settings: Settings; save: (p: Partial<Settings>) => Promise<void>; keyConfigured: boolean }) {
  const [model, setModel] = useState(settings.model);
  const [lang, setLang] = useState(settings.explanationLanguage);
  const [check, setCheck] = useState<string | null>(null);

  async function checkModel() {
    setCheck("Checking…");
    try {
      const r = await fetch(`/api/models?id=${encodeURIComponent(model.trim())}`);
      const d = (await r.json()) as { exists?: boolean; name?: string; inputPerMillion?: number | null; outputPerMillion?: number | null; suggestions?: string[]; error?: string };
      if (d.error) setCheck(d.error);
      else if (d.exists)
        setCheck(`✓ ${d.name}${d.inputPerMillion != null ? ` · $${d.inputPerMillion.toFixed(2)} in / $${d.outputPerMillion?.toFixed(2)} out per million tokens` : ""}`);
      else setCheck(`Not found on OpenRouter.${d.suggestions?.length ? ` Did you mean: ${d.suggestions.join(", ")}?` : ""}`);
    } catch {
      setCheck("Couldn't check (offline?).");
    }
  }

  return (
    <Card className="space-y-4">
      <h2 className="font-semibold">Teacher</h2>
      <div className={`rounded-xl px-3 py-2 text-sm ${keyConfigured ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"}`}>
        {keyConfigured ? "OpenRouter key found in .env.local." : "No OpenRouter key: add OPENROUTER_API_KEY=… to .env.local and restart the app."}
      </div>
      <label className="block">
        <span className="text-sm font-medium">Model</span>
        <div className="mt-1 flex gap-2">
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            onBlur={() => model.trim() && model.trim() !== settings.model && save({ model: model.trim() })}
            list="model-suggestions"
            spellCheck={false}
            className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2 font-mono text-sm"
          />
          <Button variant="secondary" onClick={checkModel}>
            Check
          </Button>
        </div>
        <datalist id="model-suggestions">
          {SUGGESTED_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.note}
            </option>
          ))}
        </datalist>
      </label>
      <div className="flex flex-wrap gap-2">
        {SUGGESTED_MODELS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              setModel(m.id);
              save({ model: m.id });
            }}
            className={`rounded-full border px-3 py-1 text-xs ${settings.model === m.id ? "border-accent bg-accent-soft text-accent" : "border-border text-muted hover:text-text"}`}
            title={m.note}
          >
            {m.id}
          </button>
        ))}
      </div>
      {check ? <p className="text-sm text-muted">{check}</p> : null}
      <label className="block">
        <span className="text-sm font-medium">Explanation language</span>
        <span className="block text-xs text-muted">Used for translations and corrections in the chat.</span>
        <input
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          onBlur={() => lang.trim() && lang.trim() !== settings.explanationLanguage && save({ explanationLanguage: lang.trim() })}
          className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
        />
      </label>
    </Card>
  );
}

function AudioCard({ rate, save }: { rate: number; save: (p: Partial<Settings>) => Promise<void> }) {
  const { voices, ready, supported } = useChineseVoices();
  const [voice, setVoice] = useState<string>(() => (typeof window === "undefined" ? "" : (preferredVoice() ?? "")));
  const [local, setLocal] = useState(rate);
  return (
    <Card className="space-y-4" id="audio">
      <h2 className="font-semibold">Audio</h2>
      <label className="block">
        <span className="text-sm font-medium">Speed: {local.toFixed(2)}×</span>
        <input
          type="range"
          min={0.5}
          max={1.5}
          step={0.05}
          value={local}
          onChange={(e) => setLocal(Number(e.target.value))}
          onPointerUp={() => save({ audioRate: local })}
          onKeyUp={() => save({ audioRate: local })}
          className="mt-2 w-full accent-[var(--accent)]"
        />
      </label>
      {ready && voices.length > 0 ? (
        <label className="block">
          <span className="text-sm font-medium">Voice (this device)</span>
          <select
            value={voice}
            onChange={(e) => {
              setVoice(e.target.value);
              setPreferredVoice(e.target.value || null);
            }}
            className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
          >
            <option value="">Automatic</option>
            {voices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name} ({v.lang}){v.localService ? "" : " · online"}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <Button variant="secondary" onClick={() => speak("你好，我是你的中文老师。", local)}>
        Test: 你好，我是你的中文老师。
      </Button>
      {ready && (!supported || voices.length === 0) ? (
        <div className="space-y-2 rounded-xl bg-warn-soft p-4 text-sm">
          <p className="font-medium text-warn">No Chinese voice is installed in this browser.</p>
          <p>Audio buttons and listening questions need a Mandarin (zh-CN) voice. To add one:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <b>Windows:</b> Settings → Time &amp; language → Speech → Manage voices → Add voices → <i>Chinese (Simplified, China)</i>. Restart the
              browser.
            </li>
            <li>
              <b>macOS:</b> System Settings → Accessibility → Spoken Content → System voice → Manage Voices → Chinese (China mainland), e.g.
              Tingting. Restart the browser.
            </li>
            <li>
              <b>iPhone / iPad:</b> Settings → Accessibility → Spoken Content → Voices → Chinese (China mainland).
            </li>
            <li>
              <b>Android:</b> Settings → System → Languages → Text-to-speech output → Google engine settings → Install voice data → Chinese
              (Mandarin, China).
            </li>
            <li>
              <b>Linux:</b> Chrome and Edge include online Chinese voices; Firefox uses speech-dispatcher (install a Mandarin voice for
              espeak-ng or RHVoice).
            </li>
          </ul>
          <p>Without a voice, the quiz simply leaves out listening questions.</p>
        </div>
      ) : null}
    </Card>
  );
}

function BackupCard() {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  async function importFile(f: File) {
    if (!window.confirm("Importing replaces ALL your current progress with the backup. Continue?")) return;
    setStatus("Importing…");
    try {
      const data = JSON.parse(await f.text());
      const res = await fetch("/api/backup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const d = (await res.json()) as { ok: boolean; error?: string; counts?: Record<string, number> };
      if (!d.ok) throw new Error(d.error);
      setStatus(`Imported: ${d.counts?.learned ?? 0} learned words, ${d.counts?.conversations ?? 0} conversations.`);
      router.refresh();
    } catch (e) {
      setStatus(`Import failed: ${(e as Error).message}`);
    } finally {
      if (file.current) file.current.value = "";
    }
  }

  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">Backup</h2>
      <p className="text-sm text-muted">Download all your progress (learned words, reviews, conversations, settings) as one JSON file, or restore it.</p>
      <div className="flex flex-wrap gap-2">
        <a href="/api/backup" download className="inline-flex items-center rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-text">
          Export backup
        </a>
        <Button variant="secondary" onClick={() => file.current?.click()}>
          Import backup…
        </Button>
        <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
      </div>
      {status ? <p className="text-sm">{status}</p> : null}
    </Card>
  );
}

function NumberField({ label, hint, value, min, max, def, onChange }: { label: string; hint?: string; value: number; min: number; max: number; def: number; onChange: (v: number) => void }) {
  const [v, setV] = useState(String(value));
  const commit = () => {
    const n = Math.round(Number(v));
    if (Number.isFinite(n) && n >= min && n <= max && n !== value) onChange(n);
    else setV(String(value));
  };
  return (
    <label className="flex flex-wrap items-center justify-between gap-3">
      <span>
        <span className="text-sm font-medium">{label}</span>
        {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
      </span>
      <span className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={v}
          onChange={(e) => setV(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          className="w-24 rounded-xl border border-border bg-surface px-3 py-2 text-right text-sm"
        />
        <span className="w-20 text-xs text-muted">default {def}</span>
      </span>
    </label>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span>
        <span className="text-sm font-medium">{label}</span>
        {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? "bg-accent" : "bg-border"}`}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-6" : "left-1"}`} />
      </button>
    </label>
  );
}

function Choice({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={`rounded-full border px-3 py-1.5 text-sm ${value === o.value ? "border-accent bg-accent-soft text-accent" : "border-border hover:bg-surface-2"}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
