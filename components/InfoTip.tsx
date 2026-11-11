"use client";

import { useId, useState } from "react";

/** A small "i" button with an explanation that opens on hover, focus or tap. */
export function InfoTip({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-xs text-muted hover:text-text"
      >
        i
      </button>
      {open ? (
        <span
          id={id}
          role="tooltip"
          className="absolute top-8 left-1/2 z-40 w-72 max-w-[85vw] -translate-x-1/2 rounded-xl border border-border bg-surface p-3 text-sm font-normal shadow-lg sm:left-0 sm:translate-x-0"
        >
          {children}
        </span>
      ) : null}
    </span>
  );
}
