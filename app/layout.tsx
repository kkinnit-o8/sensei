import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import "./globals.css";
import { AppProvider } from "@/components/AppProvider";
import { Nav } from "@/components/Nav";
import { WordPopupProvider } from "@/components/WordPopup";
import { getSettings } from "@/lib/server/settings";
import { learnedWords } from "@/lib/server/learned";

export const metadata: Metadata = {
  title: "Chinese Teacher",
  description: "Daily Mandarin practice: review, learn, quiz and chat with an AI teacher.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6f3" },
    { media: "(prefers-color-scheme: dark)", color: "#121315" },
  ],
};

// Runs before first paint so the saved theme never flashes.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("theme")||"system";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute("data-theme",d?"dark":"light")}catch(e){}})()`;

async function AppState({ children }: { children: React.ReactNode }) {
  await connection();
  return (
    <AppProvider initialSettings={getSettings()} initialLearned={learnedWords()}>
      <WordPopupProvider>{children}</WordPopupProvider>
    </AppProvider>
  );
}

function ShellFallback() {
  return <div className="mx-auto max-w-4xl px-4 py-10 text-muted">Loading…</div>;
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh antialiased">
        <Suspense fallback={<ShellFallback />}>
          <AppState>
            <Nav />
            <main className="mx-auto max-w-4xl px-4 pt-5 pb-28 md:pb-12">{children}</main>
          </AppState>
        </Suspense>
      </body>
    </html>
  );
}
