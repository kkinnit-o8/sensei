"use client";

import { CharacterArt } from "./CharacterArt";
import { SCENE_ART } from "./SceneBackground";
import { CHARACTERS, type Expression } from "@/lib/game/scenes";

export interface StageActor {
  id: string;
  expression: Expression;
  talking: boolean;
}

/**
 * The scene: background, characters standing behind the counter (or crates, or table),
 * and the foreground layer in front of them. `speaker` is highlighted when two people are there.
 */
export function GameStage({
  sceneId,
  actors,
  speaker,
  compact = false,
  children,
  className = "",
}: {
  sceneId: string;
  actors: StageActor[];
  speaker?: string | null;
  compact?: boolean;
  children?: React.ReactNode;
  className?: string;
}) {
  const art = SCENE_ART[sceneId];
  const Back = art.back;
  const Front = art.front;
  const two = actors.length > 1;
  return (
    <div
      className={`relative w-full overflow-hidden ${compact ? "aspect-[16/10]" : "aspect-[4/5] sm:aspect-[16/10]"} ${className}`}
      style={{ background: art.tint }}
    >
      <Back />
      {actors.map((a, i) => {
        const c = CHARACTERS[a.id];
        const left = two ? (i === 0 ? 30 : 70) : 50;
        const dim = two && speaker && speaker !== a.id;
        return (
          <div
            key={a.id}
            className="absolute bottom-0 transition-[filter,transform] duration-300"
            style={{
              left: `${left}%`,
              height: two ? "82%" : "90%",
              aspectRatio: "400 / 560",
              transform: `translateX(-50%) ${speaker === a.id && two ? "scale(1.03)" : ""}`,
              transformOrigin: "bottom center",
              filter: dim ? "brightness(0.82) saturate(0.85)" : undefined,
              zIndex: speaker === a.id ? 2 : 1,
            }}
          >
            <CharacterArt look={c.look} expression={a.expression} talking={a.talking} label={`${c.hanzi} ${c.name}, ${c.role}`} blinkDelay={i * 1.3} className="h-full w-full" />
          </div>
        );
      })}
      <div className="pointer-events-none absolute inset-0 z-[3]">
        <Front />
      </div>
      {children}
    </div>
  );
}
