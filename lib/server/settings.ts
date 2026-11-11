import "server-only";
import { getDb } from "./db";
import { DEFAULT_SETTINGS, settingsSchema, type Settings } from "@/lib/settings";

export function getSettings(): Settings {
  const rows = getDb().prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
  const stored: Record<string, unknown> = {};
  for (const r of rows) {
    try {
      stored[r.key] = JSON.parse(r.value);
    } catch {
      /* ignore corrupt values */
    }
  }
  // Fall back to the default for any missing or invalid value.
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const [k, v] of Object.entries(stored)) {
    const field = settingsSchema.shape[k as keyof Settings];
    if (field && field.safeParse(v).success) out[k] = v;
  }
  return out as Settings;
}

export function saveSettings(patch: Partial<Settings>): Settings {
  const merged = settingsSchema.parse({ ...getSettings(), ...patch });
  const db = getDb();
  const upsert = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
  db.transaction(() => {
    for (const [k, v] of Object.entries(merged)) upsert.run(k, JSON.stringify(v));
  })();
  return merged;
}
