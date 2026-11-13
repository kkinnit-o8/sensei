"use client";

import { useState } from "react";
import { CharacterArt } from "@/components/game/CharacterArt";
import { CHARACTERS, EXPRESSIONS, SCENES, type Expression } from "@/lib/game/scenes";

export function CastGallery() {
  const [expression, setExpression] = useState<Expression>("neutral");
  const [talking, setTalking] = useState(false);
  const sceneOf = (id: string) => SCENES.find((s) => s.missions.some((m) => m.cast.includes(id)));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {EXPRESSIONS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setExpression(e)}
            aria-pressed={expression === e}
            className={`rounded-full border px-3 py-1 text-sm ${expression === e ? "border-accent bg-accent-soft text-accent" : "border-border text-muted"}`}
          >
            {e}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setTalking((t) => !t)}
          aria-pressed={talking}
          className={`rounded-full border px-3 py-1 text-sm ${talking ? "border-accent bg-accent-soft text-accent" : "border-border text-muted"}`}
        >
          talking
        </button>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Object.values(CHARACTERS).map((c, i) => {
          const scene = sceneOf(c.id);
          return (
            <li key={c.id} className="overflow-hidden rounded-2xl border border-border bg-surface">
              <div className="bg-gradient-to-b from-accent-soft to-surface-2">
                <CharacterArt look={c.look} expression={expression} talking={talking} label={c.name} blinkDelay={i * 0.7} className="block h-auto w-full" />
              </div>
              <div className="p-3">
                <div className="flex items-baseline gap-2">
                  <span className="zh text-lg">{c.hanzi}</span>
                  <span className="text-sm text-muted">{c.name}</span>
                </div>
                <div className="text-xs text-muted">
                  {c.role}
                  {scene ? ` · ${scene.emoji} ${scene.name}` : ""}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
