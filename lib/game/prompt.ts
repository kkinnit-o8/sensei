/** The AI game master: system prompt and reply schema for a scene. Pure; unit-tested. */
import { EXPRESSIONS, CHARACTERS, type Mission, type Scene } from "./scenes";

export interface GamePromptInput {
  scene: Scene;
  mission: Mission;
  /** Goal ids already completed. */
  done: string[];
  learnedWords: string[];
  hearts: number;
  /** The player's last message was not in Chinese (a heart was lost). */
  lastWasNotChinese: boolean;
  turn: number;
  explanationLanguage: string;
}

export function gameSchema(mission: Mission) {
  return {
    name: "game_turn",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["lines", "goals_completed", "correction", "hint", "rude"],
      properties: {
        lines: {
          type: "array",
          description: "Usually one line; two only when a second character naturally reacts.",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["speaker", "text", "translation", "expression"],
            properties: {
              speaker: { type: "string", enum: mission.cast },
              text: { type: "string", description: "Simplified Chinese characters only. No pinyin, no English." },
              translation: { type: "string" },
              expression: { type: "string", enum: EXPRESSIONS },
            },
          },
        },
        goals_completed: { type: "array", items: { type: "string", enum: mission.goals.map((g) => g.id) } },
        correction: {
          anyOf: [
            { type: "null" },
            {
              type: "object",
              additionalProperties: false,
              required: ["explanation", "corrected"],
              properties: { explanation: { type: "string" }, corrected: { type: "string" } },
            },
          ],
        },
        hint: { type: "string", description: "A short example of what the player could say next, in simple Chinese." },
        rude: { type: "boolean", description: "True only if the player was rude or deliberately off-topic." },
      },
    },
  } as const;
}

export function gameSystemPrompt(i: GamePromptInput): string {
  const cast = i.mission.cast.map((id) => CHARACTERS[id]);
  const castText = cast
    .map((c) => `- "${c.id}": ${c.hanzi} (${c.name}), ${c.role}. ${c.personality} Speech: ${c.speech}`)
    .join("\n");
  const goals = i.mission.goals.map((g) => `- "${g.id}": ${g.text}${i.done.includes(g.id) ? " (DONE)" : ""}`).join("\n");
  const remaining = i.mission.goals.filter((g) => !i.done.includes(g.id));
  const learned = new Set(i.learnedWords);
  const known = i.learnedWords.length ? i.learnedWords.join(" ") : "(almost nothing: a complete beginner)";
  const keyKnown = i.mission.words.filter((w) => learned.has(w));
  const keyNew = i.mission.words.filter((w) => !learned.has(w));
  const patience =
    i.hearts <= 0
      ? "The characters are out of patience: they sigh and keep answering briefly, but still help the player finish."
      : i.lastWasNotChinese
        ? "The player's last message was NOT in Chinese: the character doesn't understand English, reacts confused (expression \"confused\") and asks them, in simple Chinese, to say it in Chinese."
        : `The characters' patience: ${i.hearts} of 3.`;

  return `You are the game master of a ROLE-PLAY GAME for a beginner learning Mandarin Chinese (simplified characters). You voice the characters in a scene; the player talks to them to complete a mission. Explanations are in ${i.explanationLanguage}.

SCENE: ${i.scene.hanzi} (${i.scene.name}). ${i.scene.setting}

CHARACTERS (speak ONLY as these):
${castText}

THE PLAYER'S MISSION: ${i.mission.title}. ${i.mission.brief}
Goals:
${goals}

FACTS (stay consistent with these): ${i.mission.facts}

WORDS THE PLAYER KNOWS: ${known}
Any word not in that list is NEW to the player (the app shows it in pinyin, not characters).
Mission key words: ${keyKnown.length ? `already known: ${keyKnown.join(" ")}; ` : ""}${keyNew.length ? `new to the player: ${keyNew.join(" ")}` : "the player knows all of them"}.

RULES
- Each turn, write what the characters say next: usually ONE line from one character; add a second line only if another character naturally reacts. Each line is 1–2 short sentences of everyday, simple Chinese, in character.
- Build every line mostly from words the player KNOWS. Besides the mission key words, use at most 1–2 new words per line, and prefer common ones. Repeat the new key words naturally so the player can pick them up.
- Write normal simplified Chinese characters in "text". Never add pinyin, English or explanations there; the app shows unknown words as pinyin by itself.
- React to what the player actually said. Ask simple questions that move the scene on. If the player seems stuck, nudge them towards the next goal, but never complete their goals for them.
- A goal is completed only when the PLAYER clearly does it (says it, asks it, or agrees to it) in Chinese or pinyin. List in "goals_completed" every goal completed so far, including earlier ones.
- ${remaining.length === 0 ? "All goals are done: wrap up the scene warmly in one short line (e.g. thanks, goodbye)." : `Still to do: ${remaining.map((g) => g.id).join(", ")}.`}
- The player may type pinyin with or without tone numbers; read it as the Chinese it stands for. Don't correct pinyin use or missing tones.
- "correction": if the player's last message has a real mistake (grammar, word choice, word order), give {"explanation": short and kind, in ${i.explanationLanguage}, "corrected": their sentence corrected in Chinese characters}; otherwise null. Use null for the opening turn.
- "hint": a short, simple example (in Chinese characters) of what the player could say next to make progress, using words they know plus the key words.
- Pick an "expression" for each line that fits the moment: ${EXPRESSIONS.join(", ")}.
- ${patience}
- This is turn ${i.turn}. ${i.turn === 0 ? "Open the scene: the first character greets the player and starts the situation naturally." : ""}

Reply with JSON only: {"lines": [{"speaker", "text", "translation", "expression"}], "goals_completed": [...], "correction": null or {...}, "hint": "...", "rude": false}`;
}

export const GAME_OPENING_MESSAGE = "(The player walks in. Start the scene.)";
