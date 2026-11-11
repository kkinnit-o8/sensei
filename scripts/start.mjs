#!/usr/bin/env node
/**
 * One-step start for Chinese Teacher. On Windows, double-click start.cmd; elsewhere run
 * `npm run app`. It:
 *   1. works from the app's own folder (wherever you start it from)
 *   2. installs dependencies when needed
 *   3. asks for your OpenRouter key once and saves it in .env.local
 *   4. offers to generate missing example sentences (resumable)
 *   5. builds the app when the code has changed, starts it and opens your browser
 *
 * Options: phone (also reachable from your phone on the same Wi-Fi), --dev (development mode),
 *          --no-open (don't open the browser), --port <n>, --skip-sentences
 * Uses only Node's built-in modules, so it runs before `npm install`.
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(ROOT);

const args = process.argv.slice(2).map((a) => a.toLowerCase());
const has = (...names) => names.some((n) => args.includes(n));
const PHONE = has("phone", "--phone", "lan", "--lan");
const DEV = has("--dev", "dev");
const OPEN = !has("--no-open");
const SKIP_SENTENCES = has("--skip-sentences");
const portArg = args.indexOf("--port");
const WANTED_PORT = portArg >= 0 ? Number(args[portArg + 1]) : 3000;
const IS_WIN = process.platform === "win32";
const NEXT_BIN = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");

const say = (msg) => console.log(`\n> ${msg}`);
function fail(msg) {
  console.error(`\nERROR: ${msg}`);
  process.exit(1);
}

/** Run a command and wait. Ctrl+C stops the command but not this script. */
function run(cmd, cmdArgs) {
  return new Promise((resolve) => {
    const ignore = () => {};
    process.on("SIGINT", ignore);
    const child = spawn(cmd, cmdArgs, { stdio: "inherit", shell: IS_WIN && cmd === "npm" });
    child.on("exit", (code, signal) => {
      process.off("SIGINT", ignore);
      resolve(signal ? 130 : (code ?? 1));
    });
    child.on("error", (e) => {
      process.off("SIGINT", ignore);
      console.error(e.message);
      resolve(1);
    });
  });
}

async function ask(question) {
  if (!process.stdin.isTTY) return "";
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

/* 1. Right place, right Node */
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
if (pkg.name !== "chinese-teacher" || !fs.existsSync(path.join(ROOT, "data", "words.json"))) {
  fail(`This script must stay inside the Chinese Teacher folder (found ${ROOT}).`);
}
const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 20 || (major === 20 && minor < 9)) {
  fail(`Node.js ${process.versions.node} is too old. Install the LTS version from https://nodejs.org and try again.`);
}
console.log(`Chinese Teacher (${ROOT})`);

/* 2. Dependencies */
const installedMarker = path.join(ROOT, "node_modules", ".package-lock.json");
const lock = path.join(ROOT, "package-lock.json");
const needsInstall =
  !fs.existsSync(NEXT_BIN) || !fs.existsSync(installedMarker) || (fs.existsSync(lock) && fs.statSync(lock).mtimeMs > fs.statSync(installedMarker).mtimeMs);
if (needsInstall) {
  say("Installing dependencies (first time only, takes a minute or two)...");
  if ((await run("npm", ["install"])) !== 0) fail("npm install failed. Check your internet connection and try again.");
}

/* 3. OpenRouter key */
const envFile = path.join(ROOT, ".env.local");
let env = fs.existsSync(envFile) ? fs.readFileSync(envFile, "utf8") : "";
let hasKey = /^\s*OPENROUTER_API_KEY\s*=\s*\S+/m.test(env) || !!process.env.OPENROUTER_API_KEY;
if (!hasKey) {
  say("The teacher chat needs an OpenRouter API key (get one at https://openrouter.ai/keys).");
  const key = (await ask("Paste your key (starts with sk-or-), or press Enter to skip for now: ")).replace(/^["']|["']$/g, "");
  if (key) {
    env = (env && !env.endsWith("\n") ? env + "\n" : env) + `OPENROUTER_API_KEY=${key}\n`;
    fs.writeFileSync(envFile, env);
    hasKey = true;
    console.log("Saved in .env.local. You won't be asked again.");
  } else {
    console.log("Skipped. Everything except the chat works without a key; you'll be asked again next time.");
  }
}

/* 4. Example sentences */
if (hasKey && !SKIP_SENTENCES) {
  const words = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "words.json"), "utf8")).words;
  const missing = words.filter((w) => !w.example).length;
  if (missing > 0) {
    say(`${missing} of ${words.length} words still have no example sentence.`);
    console.log("Generating them takes about 15-30 minutes once and costs well under $0.50.");
    console.log("You can press Ctrl+C at any time to stop and start the app; it continues next time.");
    const answer = (await ask("Generate them now? [Y/n] ")).toLowerCase();
    if (answer === "" || answer.startsWith("y")) {
      const code = await run(process.execPath, [path.join(ROOT, "node_modules", "tsx", "dist", "cli.mjs"), "scripts/build-words.ts"]);
      if (code !== 0) console.log("\nSentence generation stopped. Starting the app anyway; run start again later to continue.");
    }
  }
}

/* 5. Build when the code changed (production mode is faster to use) */
function newestSourceTime() {
  let newest = 0;
  const visit = (p) => {
    if (!fs.existsSync(p)) return;
    const st = fs.statSync(p);
    if (st.isDirectory()) for (const f of fs.readdirSync(p)) visit(path.join(p, f));
    else newest = Math.max(newest, st.mtimeMs);
  };
  for (const p of ["app", "components", "lib", "next.config.ts", "package.json", "package-lock.json", "tsconfig.json"]) visit(path.join(ROOT, p));
  return newest;
}
let dev = DEV;
if (!dev) {
  const buildId = path.join(ROOT, ".next", "BUILD_ID");
  if (!fs.existsSync(buildId) || fs.statSync(buildId).mtimeMs < newestSourceTime()) {
    say("Building the app (only after updates; takes up to a minute)...");
    if ((await run(process.execPath, [NEXT_BIN, "build"])) !== 0) {
      console.log("\nThe build failed, so the app starts in development mode instead.");
      dev = true;
    }
  }
}

/* 6. Start */
function portFree(port, host) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once("error", () => resolve(false));
    s.once("listening", () => s.close(() => resolve(true)));
    s.listen(port, host);
  });
}
let port = WANTED_PORT;
while (!(await portFree(port, "0.0.0.0")) || !(await portFree(port, "127.0.0.1"))) port++;
if (port !== WANTED_PORT) console.log(`\nPort ${WANTED_PORT} is busy (another app?), using ${port}.`);

const host = PHONE ? "0.0.0.0" : "127.0.0.1";
const server = spawn(process.execPath, [NEXT_BIN, dev ? "dev" : "start", "-p", String(port), "-H", host], {
  stdio: ["inherit", "pipe", "inherit"],
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
});
// Show the server's messages, minus its own startup banner (we print a clearer one).
server.stdout.on("data", (d) => {
  const text = d.toString();
  if (/Next\.js|Local:|Network:|Ready in|Starting|Environments|Experiments|✓ |- /.test(text) && !/error|warn/i.test(text)) return;
  process.stdout.write(text);
});
process.on("SIGINT", () => {}); // Ctrl+C reaches the server; we exit when it does
server.on("exit", (code) => {
  console.log("\nChinese Teacher stopped.");
  process.exit(code ?? 0);
});

const url = `http://localhost:${port}`;
const lanIps = Object.values(os.networkInterfaces())
  .flat()
  .filter((i) => i && i.family === "IPv4" && !i.internal)
  .map((i) => i.address);

async function waitUntilReady() {
  for (let i = 0; i < 240; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/about`);
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

if (await waitUntilReady()) {
  console.log("\n==============================================================");
  console.log(`  Chinese Teacher is running:  ${url}`);
  if (PHONE) {
    for (const ip of lanIps) console.log(`  On your phone (same Wi-Fi):   http://${ip}:${port}`);
    if (IS_WIN) console.log("  If Windows asks, allow Node.js through the firewall (private networks).");
  } else {
    console.log("  For your phone, start with:   start.cmd phone   (or npm run app -- phone)");
  }
  console.log("  Keep this window open while you study. Press Ctrl+C to stop.");
  console.log("==============================================================\n");
  if (OPEN) {
    const opener = IS_WIN ? ["cmd", ["/c", "start", "", url]] : process.platform === "darwin" ? ["open", [url]] : ["xdg-open", [url]];
    spawn(opener[0], opener[1], { stdio: "ignore", detached: true }).on("error", () => {}).unref();
  }
} else {
  console.log(`\nThe app didn't answer at ${url}. See the messages above.`);
}
