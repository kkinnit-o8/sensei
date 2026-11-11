import Link from "next/link";
import type { ComponentProps } from "react";

const VARIANTS = {
  primary: "bg-accent text-accent-text hover:opacity-90",
  secondary: "border border-border bg-surface text-text hover:bg-surface-2",
  ghost: "text-muted hover:bg-surface-2 hover:text-text",
  danger: "bg-danger-soft text-danger hover:opacity-90",
} as const;

type Variant = keyof typeof VARIANTS;

const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function Button({ variant = "primary", className = "", ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button type="button" className={`${base} ${VARIANTS[variant]} ${className}`} {...props} />;
}

export function ButtonLink({ variant = "primary", className = "", ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={`${base} ${VARIANTS[variant]} ${className}`} {...props} />;
}

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`rounded-2xl border border-border bg-surface p-5 sm:p-6 ${className}`} {...props} />;
}

export function ProgressBar({ value, max, className = "" }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-surface-2 ${className}`} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Header shown above each step of the daily session. */
export function StepHeader({ step, title, done, total }: { step: number; title: string; done?: number; total?: number }) {
  return (
    <div className="mb-5 space-y-2">
      <div className="flex items-center justify-between text-sm text-muted">
        <Link href="/" className="hover:text-text">
          ← Today
        </Link>
        <span>
          Step {step} of 5{total ? ` · ${Math.min(done ?? 0, total)} / ${total}` : ""}
        </span>
      </div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      {total ? <ProgressBar value={done ?? 0} max={total} /> : null}
    </div>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="hidden rounded border border-border bg-surface-2 px-1.5 text-[11px] text-muted sm:inline">{children}</kbd>;
}

/** Action buttons that stay in reach at the bottom of the screen while scrolling a card. */
export function StickyActions({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 -mx-2 mt-4 rounded-3xl bg-bg/95 p-2 backdrop-blur md:bottom-3 ${className}`}>
      {children}
    </div>
  );
}
