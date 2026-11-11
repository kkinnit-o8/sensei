import "server-only";

/**
 * The current time. For trying out multi-day behaviour during development you can set
 * TIME_TRAVEL_DAYS=1 (or any number) in .env.local to pretend it's that many days later.
 */
export function now(): Date {
  const days = Number(process.env.TIME_TRAVEL_DAYS || 0);
  return new Date(Date.now() + days * 86_400_000);
}
