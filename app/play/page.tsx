import Link from "next/link";
import { connection } from "next/server";
import { sceneSummaries } from "@/lib/server/game-page";
import { SCENES } from "@/lib/game/scenes";
import { GameStage } from "@/components/game/GameStage";

export const metadata = { title: "City Adventures · Chinese Teacher" };

export default async function PlayPage() {
  await connection();
  const summaries = new Map(sceneSummaries().map((s) => [s.id, s]));
  const total = [...summaries.values()].reduce((a, s) => a + s.stars, 0);
  const max = [...summaries.values()].reduce((a, s) => a + s.maxStars, 0);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="zh text-sm text-muted">城市冒险</p>
          <h1 className="text-3xl font-semibold">City Adventures</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Walk into a place, get a mission, and talk your way through it in Chinese. Just for fun: it doesn&apos;t affect your daily
            session or streak.
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold">
            ★ {total}
            <span className="text-base font-normal text-muted"> / {max}</span>
          </div>
          <Link href="/play/cast" className="text-sm text-accent underline">
            Meet the cast
          </Link>
        </div>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {SCENES.map((scene) => {
          const s = summaries.get(scene.id)!;
          return (
            <li key={scene.id}>
              <Link href={`/play/${scene.id}`} className="group block overflow-hidden rounded-3xl border border-border bg-surface transition hover:shadow-md">
                <GameStage
                  compact
                  sceneId={scene.id}
                  actors={scene.missions[0].cast.map((id) => ({ id, expression: "neutral", talking: false }))}
                  className="transition-transform duration-500 group-hover:scale-[1.02]"
                />
                <div className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-semibold">
                        {scene.emoji} {scene.name}
                      </span>
                      <span className="zh text-muted">{scene.hanzi}</span>
                    </div>
                    <p className="text-sm text-muted">{scene.description}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm" aria-label={`${s.stars} of ${s.maxStars} stars`}>
                      <span className="text-warn">★ {s.stars}</span>
                      <span className="text-muted">/{s.maxStars}</span>
                    </div>
                    {s.inProgress ? <div className="text-xs text-accent">continue →</div> : null}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
