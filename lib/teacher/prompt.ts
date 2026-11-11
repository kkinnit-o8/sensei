/** The AI teacher's system prompt and topics. Pure; unit-tested. */

export const TOPICS = [
  "food and cooking",
  "family",
  "hobbies",
  "the weather",
  "shopping",
  "travel",
  "my day",
  "weekend plans",
  "work and school",
  "friends",
  "sports and exercise",
  "music and films",
  "home and where I live",
  "health",
  "pets and animals",
  "getting around town",
  "holidays and festivals",
  "drinks and cafés",
] as const;

export function pickTopic(rng: () => number = Math.random): string {
  return TOPICS[Math.floor(rng() * TOPICS.length)];
}

export interface PromptInput {
  /** Every word the learner has learned (simplified). */
  learnedWords: string[];
  /** Today's new words with short meanings. */
  todaysWords: { simplified: string; meaning: string }[];
  /** Today's words the teacher hasn't used yet in this conversation. */
  unusedTodaysWords: string[];
  topic: string;
  /** 1-based number of the exchange the next reply belongs to (0 for the opening message). */
  exchange: number;
  totalExchanges: number;
  explanationLanguage: string;
}

/** JSON schema of the teacher's reply (used for structured outputs). */
export const TEACHER_SCHEMA = {
  name: "teacher_reply",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["reply", "translation", "correction", "hint"],
    properties: {
      reply: { type: "string", description: "The teacher's message in simplified Chinese characters only. No pinyin, no English." },
      translation: { type: "string", description: "The reply translated into the explanation language." },
      correction: {
        description: "null if the student's last message was fine; otherwise what to fix.",
        anyOf: [
          { type: "null" },
          {
            type: "object",
            additionalProperties: false,
            required: ["explanation", "corrected"],
            properties: {
              explanation: { type: "string", description: "Short explanation in the explanation language." },
              corrected: { type: "string", description: "The student's sentence, corrected, in Chinese characters." },
            },
          },
        ],
      },
      hint: { type: "string", description: "A short example of what the student could answer, in simplified Chinese." },
    },
  },
} as const;

function exchangeInstruction(i: PromptInput): string {
  if (i.exchange === 0) {
    return `This is the opening message. Greet the student briefly and ask one simple question about the topic. The student has not written anything yet, so "correction" must be null. The conversation will have ${i.totalExchanges} exchanges (one student message + your reply each).`;
  }
  if (i.exchange < i.totalExchanges) {
    const left = i.totalExchanges - i.exchange;
    return `This reply is exchange ${i.exchange} of ${i.totalExchanges} (${left} more after this one). Keep the conversation going: end with a question.`;
  }
  if (i.exchange === i.totalExchanges) {
    return `This reply is exchange ${i.exchange} of ${i.totalExchanges}: the LAST one. Wrap up naturally and warmly (for example say it was nice talking and goodbye). Don't ask a new question.`;
  }
  return `The daily target of ${i.totalExchanges} exchanges is done and the student chose to keep chatting (exchange ${i.exchange}). Continue naturally and keep asking simple questions.`;
}

export function systemPrompt(i: PromptInput): string {
  const today = i.todaysWords.length
    ? i.todaysWords.map((w) => `${w.simplified} (${w.meaning})`).join(", ")
    : "(none today)";
  const unused = i.unusedTodaysWords.length ? `Not used yet in this conversation: ${i.unusedTodaysWords.join(" ")}. Work one of them in naturally.` : "All of today's new words have been used. Keep using them when natural.";
  const known = i.learnedWords.length ? i.learnedWords.join(" ") : "(nothing yet: the student is a complete beginner)";
  return `You are a friendly, patient Mandarin Chinese teacher chatting with a beginner (simplified characters, mainland Mandarin). Explanations and corrections are written in ${i.explanationLanguage}.

TOPIC: ${i.topic}

WORDS THE STUDENT KNOWS (use mostly these): ${known}

TODAY'S NEW WORDS — use each of them naturally at least once during the conversation: ${today}
${unused}

RULES FOR YOUR MESSAGES
- Write 1–2 short sentences. Simple grammar, everyday language.
- Use mostly words from the lists above. Use at most 1–2 words per message that are not in the lists; prefer common, useful words when you do.
- Always write normal simplified Chinese characters in "reply". Never add pinyin, English or explanations to "reply" — the app converts words the student doesn't know into pinyin by itself.
- Ask the student questions to keep them talking.
- ${exchangeInstruction(i)}

THE STUDENT'S MESSAGES
- The student may type Chinese characters, or pinyin with or without tone numbers (e.g. "wo3 xi3huan1 cha2" or "wo xihuan cha"). Read pinyin as the Chinese it stands for. Never correct the use of pinyin itself, missing tone numbers, or punctuation/spacing.
- If the student's last message has a real mistake (grammar, word choice, word order, a wrong word, or something unnatural), set "correction" to {"explanation": short and kind, in ${i.explanationLanguage}, "corrected": the student's whole sentence corrected, in Chinese characters}. Otherwise "correction" is null. If the student wrote in ${i.explanationLanguage} instead of Chinese, set "correction" to show how to say it in Chinese.

OUTPUT
Reply with one JSON object and nothing else:
{"reply": "...Chinese characters only...", "translation": "...the reply in ${i.explanationLanguage}...", "correction": null or {"explanation": "...", "corrected": "..."}, "hint": "...a short example answer the student could give, in simple Chinese characters..."}`;
}

export const OPENING_USER_MESSAGE = "(The student opened the chat. Start the conversation.)";
