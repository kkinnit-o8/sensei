/** Model choices (safe to import from client code: no secrets here). */
export const DEFAULT_MODEL = "deepseek/deepseek-v4-flash";

export const SUGGESTED_MODELS = [
  { id: "deepseek/deepseek-v4-flash", note: "default · very cheap · strong in Chinese" },
  { id: "qwen/qwen3.6-flash", note: "cheap · native Chinese" },
  { id: "z-ai/glm-5.3-flash", note: "cheapest · always reasons, so slower" },
  { id: "google/gemini-3.1-flash-lite", note: "fast" },
  { id: "openai/gpt-5.4-mini", note: "pricier" },
];
