/** Settings shared by server and client. */
import { z } from "zod";
import { DEFAULT_MODEL } from "./models";

export const settingsSchema = z.object({
  newWordsPerDay: z.number().int().min(0).max(50),
  exchangesPerDay: z.number().int().min(1).max(50),
  maxReviewsPerDay: z.number().int().min(0).max(1000),
  model: z.string().trim().min(1).max(200),
  toneStyle: z.enum(["marks", "numbers"]),
  toneColors: z.boolean(),
  audioRate: z.number().min(0.5).max(1.5),
  /** Read the teacher's replies aloud as soon as they arrive. */
  autoSpeak: z.boolean(),
  theme: z.enum(["system", "light", "dark"]),
  explanationLanguage: z.string().trim().min(1).max(40),
  /** Show every word as characters with pinyin above (ruby), ignoring what is learned. */
  ruby: z.boolean(),
});

export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  newWordsPerDay: 10,
  exchangesPerDay: 10,
  maxReviewsPerDay: 100,
  model: DEFAULT_MODEL,
  toneStyle: "marks",
  toneColors: true,
  audioRate: 0.9,
  autoSpeak: true,
  theme: "system",
  explanationLanguage: "English",
  ruby: false,
};
