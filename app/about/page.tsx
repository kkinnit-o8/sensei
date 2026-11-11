import Link from "next/link";

const SOURCES = [
  {
    name: "Complete HSK Vocabulary",
    by: "Yanis Zafirópulos (drkameleon)",
    url: "https://github.com/drkameleon/complete-hsk-vocabulary",
    licence: "MIT",
    use: "The HSK 3.0 level 1–3 word list (2,209 words): parts of speech, HSK levels, traditional forms and frequency ranks.",
  },
  {
    name: "CC-CEDICT",
    by: "MDBG and the CC-CEDICT community (based on CEDICT by Paul Andrew Denisowski)",
    url: "https://www.mdbg.net/chinese/dictionary?page=cc-cedict",
    licence: "CC BY-SA 4.0",
    use: "The dictionary used for look-ups, word segmentation, readings and custom words. The word meanings in the HSK list also come from CC-CEDICT.",
  },
  {
    name: "wordfreq",
    by: "Robyn Speer and contributors",
    url: "https://github.com/rspeer/wordfreq",
    licence: "CC BY-SA 4.0 (data), Apache 2.0 (code)",
    use: "Word frequencies for segmentation and the reading-coverage estimate (data/zh-freq.tsv is derived from it). wordfreq itself includes data from SUBTLEX-CH, OpenSubtitles, Wikipedia and other sources.",
  },
  {
    name: "Hanzi Writer + hanzi-writer-data",
    by: "David Chanin; stroke data from Make Me a Hanzi (Shaunak Kishore)",
    url: "https://hanziwriter.org",
    licence: "MIT (library); Arphic Public License (character data, derived from Arphic fonts)",
    use: "Stroke-order animations and writing practice, served locally so they work offline.",
  },
  {
    name: "pinyin-pro",
    by: "zh-lx",
    url: "https://github.com/zh-lx/pinyin-pro",
    licence: "MIT",
    use: "Context-aware pinyin for whole sentences (polyphones, 一 and 不 tone changes).",
  },
  {
    name: "ts-fsrs",
    by: "Open Spaced Repetition",
    url: "https://github.com/open-spaced-repetition/ts-fsrs",
    licence: "MIT",
    use: "The FSRS spaced-repetition scheduler for reviews.",
  },
];

export default function AboutPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">About</h1>
        <p className="mt-2 text-muted">
          A personal Mandarin study app. It runs on your own computer; your progress stays in a local SQLite file. Only the teacher
          chat (and the word bank build script) uses the network, through OpenRouter.
        </p>
      </div>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Data sources and licences</h2>
        <ul className="space-y-3">
          {SOURCES.map((s) => (
            <li key={s.name} className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <a href={s.url} className="font-medium text-accent underline" target="_blank" rel="noreferrer">
                  {s.name}
                </a>
                <span className="rounded bg-surface-2 px-2 py-0.5 text-xs text-muted">{s.licence}</span>
              </div>
              <div className="mt-1 text-sm text-muted">{s.by}</div>
              <p className="mt-2 text-sm">{s.use}</p>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted">
          Data derived from CC BY-SA sources (data/words.json, data/zh-freq.tsv and the dictionary database) is shared under the same
          licence. Example sentences are hand-written or generated with a language model through OpenRouter.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">How the chat text works</h2>
        <p className="text-sm">
          The teacher always writes normal Chinese characters. The app then splits the text into words and shows each word you have
          learned in characters and every other word in pinyin. This is done by code, not by the AI, so the rule is always followed.
          Try it in the <Link href="/renderer" className="text-accent underline">renderer playground</Link>.
        </p>
      </section>
      <Link href="/" className="text-sm text-accent underline">
        Back to today
      </Link>
    </div>
  );
}
