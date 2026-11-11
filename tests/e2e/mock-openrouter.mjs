/**
 * A tiny stand-in for the OpenRouter API, used by the end-to-end test (and handy for trying the
 * chat without a key). Start: node tests/e2e/mock-openrouter.mjs [port]
 * Then run the app with OPENROUTER_BASE_URL=http://localhost:<port>/api/v1 OPENROUTER_API_KEY=test
 *
 * Behaviour:
 *   - the opening message greets and asks what you ate today
 *   - your first message always gets a correction (so corrections can be tested)
 *   - a message containing 坏 makes the mock answer with invalid JSON, to test the fallback
 *   - replies use 茶 (tea), which a beginner hasn't learned, to test "Words from chat"
 */
import http from "node:http";

const port = Number(process.argv[2] || process.env.MOCK_PORT || 4010);

const REPLIES = [
  { reply: "很好！你喜欢喝茶吗？", translation: "Very good! Do you like drinking tea?", hint: "我喜欢喝茶。" },
  { reply: "我也喜欢。你今天在家吗？", translation: "Me too. Are you at home today?", hint: "我今天在家。" },
  { reply: "好的。你想去哪儿？", translation: "OK. Where do you want to go?", hint: "我想去北京。" },
];

function teacherReply(body) {
  const msgs = body.messages ?? [];
  const users = msgs.filter((m) => m.role === "user" && !m.content.startsWith("(The student") && !m.content.startsWith("That answer was not valid"));
  const system = msgs[0]?.content ?? "";
  const lastStudent = users[users.length - 1];
  if (lastStudent && lastStudent.content.includes("坏")) return "Sorry, I can't produce JSON right now. 你好！";
  if (users.length === 0) {
    return JSON.stringify({ reply: "你好！你今天吃了什么？", translation: "Hello! What did you eat today?", correction: null, hint: "我今天吃了米饭。" });
  }
  const wrapUp = /LAST one/.test(system);
  const r = wrapUp
    ? { reply: "今天很好，再见！", translation: "Today was nice, goodbye!", hint: "再见！" }
    : REPLIES[(users.length - 1) % REPLIES.length];
  const correction = users.length === 1 ? { explanation: "Put 了 right after the verb.", corrected: "我吃了米饭。" } : null;
  return JSON.stringify({ ...r, correction });
}

export function startMock(p = port) {
  const server = http.createServer((req, res) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      res.setHeader("Content-Type", "application/json");
      if (req.method === "GET" && req.url?.endsWith("/models")) {
        res.end(JSON.stringify({ data: [{ id: "deepseek/deepseek-v4-flash", reasoning: { mandatory: false, supported_efforts: ["high", "none"] } }] }));
        return;
      }
      if (req.method === "POST" && req.url?.endsWith("/chat/completions")) {
        if (req.headers.authorization !== "Bearer test") {
          res.statusCode = 401;
          res.end(JSON.stringify({ error: { message: "No auth credentials found" } }));
          return;
        }
        const body = JSON.parse(data || "{}");
        const content = teacherReply(body);
        res.end(
          JSON.stringify({
            id: "mock",
            model: body.model,
            choices: [{ message: { role: "assistant", content }, finish_reason: "stop" }],
            usage: { prompt_tokens: 1200, completion_tokens: 60, cost: 0.00012 },
          }),
        );
        return;
      }
      res.statusCode = 404;
      res.end(JSON.stringify({ error: { message: "not found" } }));
    });
  });
  server.listen(p, () => console.log(`mock OpenRouter on http://localhost:${p}/api/v1`));
  return server;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) startMock();
