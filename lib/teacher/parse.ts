/** Parsing and validating the teacher's JSON reply. Pure; unit-tested. */
import { z } from "zod";
import { extractJsonObject } from "../json";

export interface TeacherReply {
  reply: string;
  translation: string;
  correction: { explanation: string; corrected: string } | null;
  hint: string;
}

const correctionSchema = z
  .union([
    z.null(),
    z.literal(""),
    z.object({ explanation: z.string().optional().default(""), corrected: z.string().optional().default("") }),
    z.string(),
  ])
  .optional()
  .transform((c): TeacherReply["correction"] => {
    if (c === null || c === undefined || c === "") return null;
    if (typeof c === "string") return /^(none|null|no|n\/a)$/i.test(c.trim()) ? null : { explanation: c.trim(), corrected: "" };
    const explanation = c.explanation.trim();
    const corrected = c.corrected.trim();
    if (!explanation && !corrected) return null;
    return { explanation, corrected };
  });

const replySchema = z.object({
  reply: z.string().trim().min(1),
  translation: z.string().optional().default(""),
  correction: correctionSchema,
  hint: z.string().optional().default(""),
});

const HAN = /[㐀-鿿]/;

/**
 * Remove pinyin or English the model added to the Chinese reply despite instructions,
 * e.g. "你好！(nǐ hǎo)" -> "你好！". Only removes bracketed parts with Latin letters.
 */
export function cleanReply(reply: string): string {
  return reply
    .replace(/\s*[(（][^()（）]*[A-Za-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü][^()（）]*[)）]/g, "")
    .replace(/\s+/g, (m) => (m.includes("\n") ? "\n" : " "))
    .trim();
}

export type ParseResult = { ok: true; value: TeacherReply } | { ok: false; error: string };

export function parseTeacherReply(raw: string): ParseResult {
  const obj = extractJsonObject(raw);
  if (obj === undefined) return { ok: false, error: "The reply was not JSON" };
  const parsed = replySchema.safeParse(obj);
  if (!parsed.success) return { ok: false, error: `Bad fields: ${parsed.error.issues.map((i) => i.path.join(".") || i.message).join(", ")}` };
  const reply = cleanReply(parsed.data.reply);
  if (!HAN.test(reply)) return { ok: false, error: "The reply has no Chinese characters" };
  return {
    ok: true,
    value: {
      reply,
      translation: parsed.data.translation.trim(),
      correction: parsed.data.correction,
      hint: cleanReply(parsed.data.hint),
    },
  };
}
