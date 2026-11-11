"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "./AppProvider";

const LINKS = [
  { href: "/", label: "Today", icon: "M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5" },
  { href: "/words", label: "Words", icon: "M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Zm0 13a3 3 0 0 1 3-3h11" },
  { href: "/progress", label: "Progress", icon: "M4 20V10m6 10V4m6 16v-7m4 7H2" },
  { href: "/history", label: "Chats", icon: "M4 5h16v11H9l-5 4V5Z" },
  { href: "/settings", label: "Settings", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.3l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2.2-1.3L14.4 3h-4l-.4 2.4a7 7 0 0 0-2.2 1.3l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.6l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2.2 1.3l.4 2.4h4l.4-2.4a7 7 0 0 0 2.2-1.3l2.4 1 2-3.4-2-1.6c.1-.4.1-.9.1-1.3Z" },
];

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" || path.startsWith("/session") : path.startsWith(href);
}

/** Header toggle: show every word in characters with pinyin above (ruby). */
function RubyToggle() {
  const { settings, updateSettings } = useApp();
  return (
    <button
      type="button"
      onClick={() => updateSettings({ ruby: !settings.ruby })}
      aria-pressed={settings.ruby}
      title={settings.ruby ? "Showing all characters with pinyin above. Click to go back." : "Show all characters with pinyin above"}
      className={`rounded-lg border px-2 py-1 text-sm transition-colors ${
        settings.ruby ? "border-accent bg-accent-soft text-accent" : "border-border text-muted hover:text-text"
      }`}
    >
      <ruby className="zh">
        字<rt>zì</rt>
      </ruby>
      <span className="sr-only">Pinyin above characters</span>
    </button>
  );
}

export function Nav() {
  const path = usePathname();
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="zh rounded-md bg-accent px-1.5 py-0.5 text-lg leading-tight text-accent-text">老师</span>
            <span className="hidden sm:inline">Chinese Teacher</span>
          </Link>
          <div className="flex items-center gap-2">
          <nav className="hidden gap-1 md:flex" aria-label="Main">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  isActive(path, l.href) ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-surface-2 hover:text-text"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <RubyToggle />
          </div>
        </div>
      </header>
      {/* Phone: bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Main"
      >
        <div className="mx-auto grid max-w-md grid-cols-5">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${isActive(path, l.href) ? "text-accent" : "text-muted"}`}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round" strokeLinecap="round" aria-hidden>
                <path d={l.icon} />
              </svg>
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
