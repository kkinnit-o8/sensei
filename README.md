# Chinese Teacher

A personal web app for learning Mandarin Chinese (simplified characters), meant to run on your own computer.
Every day you do one guided session: review old words, learn a few new ones, take a short quiz, then chat in
Chinese with an AI teacher. In the chat, every word you have learned is shown in characters and every word you
haven't learned yet is shown in pinyin, so the chat turns into more and more characters as you learn.

Explanations, meanings and corrections are in English.

## Requirements

- **Node.js 20.9 or newer** (developed and tested with Node 22). Check with `node --version`.
- npm (comes with Node).
- An [OpenRouter](https://openrouter.ai/keys) API key for the teacher chat and for building the example sentences.
  Everything else works offline.

## Setup

```bash
npm install
```

Create `.env.local` with your OpenRouter key (the file is git-ignored; the key is only read by the server and never
sent to the browser):

```bash
cp .env.example .env.local
```

Then edit `.env.local` so it contains `OPENROUTER_API_KEY=sk-or-v1-...`.

## Build the word bank (example sentences)

`data/words.json` is committed and already contains all **2,209 words** (HSK 3.0 levels 1–3, most frequent first)
with pinyin, meanings, parts of speech, HSK level and frequency. The first 60 words also have hand-written, checked
example sentences. To generate a short gloss and an example sentence for every other word, run:

```bash
npm run build:words
```

- It reads the key from `.env.local`, sends the words to OpenRouter in batches of 12, checks every sentence
  (it must contain the word and should only use words ranked before it), retries failures with feedback up to
  3 times, and flags the ones that still break the rules.
- It saves after every batch, so you can stop it with Ctrl+C and run it again: it continues where it stopped.
- Expect roughly 15–30 minutes and well under US$0.50 with the default model.
- Options: `--model <id>`, `--batch <n>`, `--attempts <n>`, `--limit <n>`, `--redo-flagged`, `--skip-llm`.

Then check the result:

```bash
npm run validate:words
```

This writes `data/words-report.md`, listing every sentence that uses later-ranked words or words outside the bank.

## Run

```bash
npm run dev
```

Open <http://localhost:3000>. The CC-CEDICT dictionary is imported into `data/dict.db` automatically the first time
it's needed (about a second). To redo it by hand, run `npm run build:dict`.

### On your phone (same Wi-Fi)

```bash
npm run dev:lan
```

Find your computer's local IP address (macOS: System Settings → Wi-Fi → Details; Windows: `ipconfig`; Linux:
`hostname -I`), then open `http://<that-ip>:3000` on your phone, for example `http://192.168.1.23:3000`. If it
doesn't load, allow incoming connections for Node in your computer's firewall.

## Your data

- Progress is stored in `data/progress.db` (SQLite, git-ignored).

## Data sources and licences

| Source | Licence | Used for |
|---|---|---|
| [complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary) by drkameleon | MIT | HSK 3.0 word list, levels, parts of speech, traditional forms, frequency ranks |
| [CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cc-cedict) (MDBG) | CC BY-SA 4.0 | Dictionary look-ups, readings, segmentation, word meanings (also the source of the HSK list's meanings) |
| [wordfreq](https://github.com/rspeer/wordfreq) | CC BY-SA 4.0 (data) | Word frequencies (`data/zh-freq.tsv`, exported with `scripts/export-wordfreq.py`) |
| [Hanzi Writer](https://hanziwriter.org) + [hanzi-writer-data](https://github.com/chanind/hanzi-writer-data) | MIT; data under the Arphic Public License | Stroke order animations and writing practice |
| [pinyin-pro](https://github.com/zh-lx/pinyin-pro) | MIT | Context-aware pinyin |
| [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) | MIT | Spaced repetition scheduling |

`data/words.json`, `data/zh-freq.tsv` and the dictionary database are derived from CC BY-SA data and are shared
under CC BY-SA 4.0. The same list is on the app's About page.
