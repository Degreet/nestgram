const UNIT_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export interface ParsedReminder {
  text: string;
  dueAt: Date;
}

/**
 * Parses `"in 10m Buy milk"` / `"2h Call mom"` into a due time + text. Returns
 * null when the input isn't a reminder (so a handler can fall through). The
 * `now` is passed in to keep this pure and unit-testable.
 */
export function parseReminder(input: string, now: Date): ParsedReminder | null {
  const match = input.trim().match(/^(?:in\s+)?(\d+)\s*([smhd])\s+(.+)$/is);
  if (!match) {
    return null;
  }
  const [, amount, unit, text] = match;
  const offset = Number(amount) * UNIT_MS[unit.toLowerCase()];
  return { text: text.trim(), dueAt: new Date(now.getTime() + offset) };
}
