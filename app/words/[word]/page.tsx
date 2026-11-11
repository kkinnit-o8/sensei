import { notFound } from "next/navigation";
import Link from "next/link";
import { wordInfo } from "@/lib/server/word-info";
import { tokenizeText } from "@/lib/server/lexicon";
import { WordDetail } from "./word-detail";

export default async function WordPage({ params }: PageProps<"/words/[word]">) {
  const { word } = await params;
  const w = decodeURIComponent(word);
  const info = wordInfo(w);
  if (info.source === "none") notFound();
  const exampleTokens = info.example ? tokenizeText(info.example.zh) : undefined;
  return (
    <div className="space-y-4">
      <Link href="/words" className="text-sm text-accent underline">
        ← All words
      </Link>
      <WordDetail info={info} exampleTokens={exampleTokens} />
    </div>
  );
}
