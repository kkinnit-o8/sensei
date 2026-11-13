import { notFound } from "next/navigation";
import { connection } from "next/server";
import { sceneBriefing } from "@/lib/server/game-page";
import { GameScreen } from "./game-screen";

export default async function ScenePage({ params }: PageProps<"/play/[scene]">) {
  await connection();
  const { scene } = await params;
  const data = sceneBriefing(scene);
  if (!data) notFound();
  return <GameScreen key={scene} sceneId={scene} briefings={data.briefings} initialRun={data.openRun} />;
}
