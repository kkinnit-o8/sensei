# Chinese Teacher

A personal web app for learning Mandarin Chinese (simplified characters) that runs on your own computer.

Every day you do one guided session in five steps:

1. **Review**: words due today (FSRS spaced repetition), capped per day.
2. **Learn**: new words in frequency order (words you queued from the chat come first).
3. **Quick check**: a short quiz on today's words (characters → meaning, audio → characters, meaning → characters).
4. **Conversation**: a chat in Chinese with an AI teacher (through your OpenRouter key).
5. **Summary**: what you learned, your quiz score, the teacher's corrections, and your streak.

In the chat, and everywhere else Chinese appears, **every word you have learned is shown in characters and
every word you haven't learned yet is shown in pinyin**. This is done by code, not by the AI. The more you
learn, the more of the chat turns into characters. Tap any word to see its meaning, hear it, see its stroke
order, or add it to your learning queue.

Meanings, explanations and corrections are in English. The layout works on a computer and on a phone.

## Quick start

**Windows:** double-click **`start.cmd`** in this folder. **Mac/Linux:** run `npm run app`.

The start script does everything for you:

1. Installs what's needed.
2. Asks for your OpenRouter key once and saves it in `.env.local`.
3. Offers to generate the missing example sentences. You can stop with Ctrl+C at any time; it continues next
   time.
4. Builds the app after updates, starts it and opens your browser.

Keep the window open while you study, and press Ctrl+C to stop.

**Desktop shortcut (Windows):** double-click **`add-to-desktop.cmd`** once. It puts a **Chinese Teacher** icon
on your desktop that runs `start.cmd`. You can run it again at any time, for example after moving the folder.

To use the app from your phone as well, run `start.cmd phone` (or `npm run app -- phone`). It then prints the
address to open on your phone. Without `phone`, the app is only reachable from this computer.

The sections below explain the same steps by hand.

## City Adventures (side game)

A game on the side under **Play**. It isn't part of the daily session and doesn't affect your streak.

1. **Pick a place:** ☕ café, 🏪 convenience store, 🍜 restaurant, 🚄 train station or 🍎 street market.
2. **Get a mission**, for example "order for you and your friend, then find out the price".
3. **Talk your way through it** with the AI characters.

Each place has its own animated characters (barista 小林, your friend 美美, the sleepy clerk 王叔叔, restaurant owner
陈阿姨, nervous waiter 小明, ticket officer 李先生 and fruit-seller grandma 张奶奶). Each has a personality, a voice and
facial expressions. Meet them all under **Play → Meet the cast**.

How a round works:

- **What the characters say:** their lines use the same rule as the chat: words you know in characters, new words
  in pinyin, and every word is tappable.
- **Matching your level:** the game master knows which words you've learned and which of the mission's key words
  are new to you, and keeps each line to words you know plus at most one or two new ones.
- **Answering:** type characters or pinyin, use the mic, or turn on speaking mode. Lines are read aloud in each
  character's voice.
- **Patience:** you have 3 ♥. Writing in English (or being rude) costs one; the game decides this by code, not by
  the AI. You never fail. You just get fewer stars.
- **Stars:** ★ finish the mission, ★ lose at most one heart, ★ use at most one hint.
- **New words:** words you met can be sent to tomorrow's learning queue.

The characters and places are drawn in code (SVG), so they work offline and stay sharp on any screen. Playing
needs the OpenRouter key, like the chat.

## Requirements

- **Node.js 20.9 or newer** (developed and tested with Node 22). Check with `node --version`.
- npm (comes with Node).
- An [OpenRouter](https://openrouter.ai/keys) API key, used only for the teacher chat and the word bank build
  script. **Everything else works offline.**

## Setup

```bash
npm install
```

Create `.env.local` with your OpenRouter key. The file is git-ignored. The key is only read by the server
and is never sent to the browser.

```bash
cp .env.example .env.local
```

Then edit `.env.local` so it reads `OPENROUTER_API_KEY=sk-or-v1-...`.

## Build the word bank (example sentences)

`data/words.json` is committed. It already contains all **2,209 words** of HSK 3.0 levels 1–3, most
frequent first, with traditional characters, pinyin (tone marks and numbers), meanings, part of speech,
HSK level and frequency. The first 60 words also have hand-written, checked example sentences.

To generate a short gloss and an example sentence for every other word:

```bash
npm run build:words
```

- It reads the key from `.env.local` and sends the words to OpenRouter in batches of 12.
- It checks every sentence. The sentence must contain the word, and should use only words ranked before it,
  so you can read it on the day you learn the word.
- Failures are retried with feedback up to 3 times. The best attempt is kept, and it is flagged if it still
  breaks the rules.
- It saves after every batch. You can stop it with Ctrl+C and run it again, and it continues where it left
  off.
- Sentence pinyin is generated by code (pinyin-pro plus the dictionary), not by the model.
- Expect roughly 15–30 minutes and well under US$0.50 with the default model.
- Options: `--model <id>`, `--batch <n>`, `--attempts <n>`, `--limit <n>`, `--redo-flagged`,
  `--skip-llm` (deterministic part only), `--refresh-hsk` (download the HSK list again).

Then check the result:

```bash
npm run validate:words
```

This checks the schema, readings and stroke-order data. It writes `data/words-report.md`, which lists every
sentence that uses later-ranked words or words outside the bank. Commit the updated `data/words.json` if you
like.

## Run

```bash
npm run dev
```

Open <http://localhost:3000>. The first time a page needs the dictionary, CC-CEDICT is imported into
`data/dict.db` automatically, which takes about a second. To redo the import by hand, run
`npm run build:dict`.

For day-to-day use, a production build is faster:

```bash
npm run build
```

```bash
npm run start
```

### On your phone (same Wi-Fi)

```bash
npm run dev:lan
```

Find your computer's local IP address:

- macOS: System Settings → Wi-Fi → Details.
- Windows: run `ipconfig`.
- Linux: run `hostname -I`.

Then open `http://<that-ip>:3000` on your phone, for example `http://192.168.1.23:3000`. If it doesn't load,
allow incoming connections for Node in your computer's firewall. (With a production build, use
`npm run start -- -H 0.0.0.0`.)

### Audio

Audio uses your browser's built-in text-to-speech with a Mandarin (zh-CN) voice. If no Chinese voice is
installed, Settings → Audio explains how to add one on Windows, macOS, iOS, Android and Linux.

**Silent mode** is for when you can't listen, for example on the bus or in an office. Turn it on with the speaker
icon in the header or in Settings → Audio.

- No sound plays and audio buttons are hidden.
- Listening questions in the quick check show the pinyin to read instead. You still pick the right characters.
- It is saved per device, so your phone can be silent while your computer isn't.

Without a Chinese voice, listening questions show pinyin the same way.

### Talking with the teacher

- **Replies are read aloud as soon as they arrive.** You can turn this off in Settings → Audio.
- **Mic button** next to the chat box: speak Chinese, and the text appears in the box so you can check it
  before sending.
- **🎙 Speaking mode** (button above the chat) is hands-free. The teacher's reply is read aloud, then the mic
  starts by itself, and what you say is sent when you pause.

Speech input uses the browser's speech recognition: Chrome, Edge or Safari, with an internet connection
(the browser sends the audio to its speech service).

Browsers only allow the microphone on secure pages. That works on the computer running the app
(`http://localhost:3000`), but not on a phone opening `http://192.168.x.x:3000`. On the phone, use your
keyboard's microphone key instead, with a Chinese keyboard added.

## Settings

Settings are under **Settings** in the app.

| Setting | Default |
|---|---|
| New words per day | 10 |
| Exchanges per day | 10 |
| Maximum reviews per day | 100 |
| Model | `deepseek/deepseek-v4-flash` (suggestions included; the **Check** button looks the ID up on OpenRouter) |
| Pinyin | tone marks (or tone numbers) |
| Tone colours | on |
| Pinyin above every character (ruby) | off (also a toggle in the header) |
| Audio speed and voice | 0.9×, automatic voice |
| Silent mode (per device) | off (also a speaker toggle in the header) |
| Read the teacher's replies aloud | on |
| Theme | like your device (or light / dark) |
| Explanation language | English |

The study day rolls over at **04:00** in your computer's time zone, so a late-night session still counts for
the day you started it. The streak grows on each day where all five steps are done.

## Your data and backups

- Progress is stored in `data/progress.db` (SQLite, git-ignored). The dictionary is in `data/dict.db`
  (generated, git-ignored).
- **Settings → Backup** exports everything (learned words, review history, conversations, settings) as one
  JSON file and imports it again. An import replaces your current progress.
- Every conversation is saved; reread them under **Chats**.

## Tests

```bash
npm test
```

Runs the unit tests (Vitest): the renderer, word segmentation (several algorithms are compared on a
hand-segmented set), pinyin, review scheduling, day rollover and streak, the quiz, parsing of the teacher's
output, the server chat logic, backup, and progress.

```bash
npm run test:e2e
```

Runs a full daily session in a real browser (Playwright) against a mocked OpenRouter. It uses its own
database and build folder, so it doesn't touch your progress or a running dev server. If Playwright asks for
a browser, run `npx playwright install chromium` once.

```bash
npm run typecheck
```

```bash
npm run lint
```

To try the chat without a key, start the mock teacher in one terminal:

```bash
node tests/e2e/mock-openrouter.mjs 4010
```

Then start the app against it in another terminal:

```bash
OPENROUTER_BASE_URL=http://localhost:4010/api/v1 OPENROUTER_API_KEY=test npm run dev
```

To try multi-day behaviour (reviews coming due), set `TIME_TRAVEL_DAYS=1` in `.env.local` and restart. Use a
backup or a separate `DB_PATH=...` if you don't want to mix test days into your real progress.

## How it works

- **Word bank** (`scripts/build-words.ts` → `data/words.json`): HSK 3.0 levels 1–3 sorted by the dataset's
  frequency rank (which looks subtitle-based, close to everyday speech). Erhua words (一点儿, 这儿) are ranked
  by the frequency of the plain form. Main readings of polyphones come from CC-CEDICT and a small override
  table. Word ids stay stable across rebuilds; progress is keyed by the simplified word.
- **Renderer** (`lib/zh/`): text is segmented with a unigram model over the word bank + CC-CEDICT using wordfreq
  probabilities, with a small bonus for word-bank words. Unit tests compare this with maximum matching and
  `Intl.Segmenter`, and it scores best. Pinyin comes from the whole sentence (pinyin-pro, so polyphones and
  the tone changes of 一 and 不 come out right), with dictionary readings for neutral tones and erhua.
  `lib/zh/render.ts` then applies the rule:
  - learned words are shown in characters;
  - a segment that isn't itself learned (such as a compound outside the bank) is shown in characters only if
    it splits completely into learned words;
  - everything else is shown in pinyin.

  Segmentation runs in the local server, so the large dictionary never goes to your phone.
- **Spaced repetition** (`lib/srs.ts`): FSRS (ts-fsrs) with whole-day intervals. Only the first rating of a day
  changes a card's schedule. Cards you rate Again come back at the end of the Review step. Quiz mistakes rate
  the word Again.
- **Teacher** (`lib/teacher/`, `lib/server/chat.ts`): the system prompt contains your learned words, today's new
  words (and which are still unused), the topic and the exchange count. Replies are structured JSON
  (`reply`, `translation`, `correction`, `hint`), validated with zod and retried once. If a reply is still
  invalid, the raw text is shown. For each model the app asks for the lowest reasoning effort it supports,
  to keep replies fast.

### Extending later

The code is laid out so these are straightforward to add:

- **Traditional characters:** stored for every word (bank, custom, CC-CEDICT). A display setting could map
  tokens to their traditional form.
- **Character components:** add a decomposition dataset and show it on the word page.
- **Speaking practice:** the Web Speech API's recognition could feed the chat input.
- **More quiz types:** add one to `QuizType` in `lib/quiz.ts` and a prompt/option renderer in the quiz step.

## Data sources and licences

| Source | Licence | Used for |
|---|---|---|
| [complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary) by drkameleon | MIT | HSK 3.0 word list, levels, parts of speech, traditional forms, frequency ranks |
| [CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cc-cedict) (MDBG and contributors) | CC BY-SA 4.0 | Dictionary look-ups, readings, segmentation, custom words; also the source of the HSK list's meanings |
| [wordfreq](https://github.com/rspeer/wordfreq) | CC BY-SA 4.0 (data) | Word frequencies (`data/zh-freq.tsv`, exported with `scripts/export-wordfreq.py`) for segmentation and the reading-coverage estimate |
| [Hanzi Writer](https://hanziwriter.org) + [hanzi-writer-data](https://github.com/chanind/hanzi-writer-data) | MIT; character data under the Arphic Public License (from Make Me a Hanzi) | Stroke order animations and writing practice, served locally |
| [pinyin-pro](https://github.com/zh-lx/pinyin-pro) | MIT | Context-aware pinyin |
| [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) | MIT | Spaced repetition scheduling |

`data/words.json`, `data/zh-freq.tsv` and the dictionary database are derived from CC BY-SA data and are shared
under CC BY-SA 4.0. The CC-CEDICT source file is included in `data/sources/` so the app works offline from a
fresh clone. Example sentences are hand-written (the first 60) or generated with a language model through
OpenRouter. The same list is on the app's About page.
