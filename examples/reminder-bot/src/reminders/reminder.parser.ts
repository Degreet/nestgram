import { Injectable } from '@nestjs/common';

import type { ParsedReminder } from './types';

@Injectable()
export class ReminderParser {
  private static readonly UNIT_MS: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };

  private static readonly PATTERN = /^(?:in\s+)?(\d+)\s*([smhd])\s+(.+)$/is;

  parse(input: string, now: Date): ParsedReminder | null {
    const match = input.trim().match(ReminderParser.PATTERN);
    if (!match) {
      return null;
    }
    const [, amount, unit, text] = match;
    const offset = Number(amount) * ReminderParser.UNIT_MS[unit.toLowerCase()];
    return { text: text.trim(), dueAt: new Date(now.getTime() + offset) };
  }
}
