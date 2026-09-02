/**
 * Shared JSDoc helpers for the emitters. Both the command-class emitter and the
 * BotService-sugar emitter document generated methods from the same spec
 * description + Bot API doc link, so the formatting lives in one place.
 */
import { IrMethod } from './ir';

/**
 * Neutralize `*​/` so spec text can't close the doc comment early and leave the
 * rest of itself as executable TypeScript. `loadSpec` already refuses such a
 * spec; this is the second lock, because the cost of being wrong here is code
 * execution in an unattended regeneration.
 */
export function sanitize(text: string): string {
  return (text ?? '').replace(/\*\//g, '*\\/').trim();
}

/**
 * A class-level JSDoc for a generated command object: the method's spec
 * description plus an `@see` link to the official Bot API docs. Empty when the
 * spec carries neither.
 */
export function classJsdoc(method: IrMethod): string {
  const lines: string[] = [];
  const description = sanitize(method.description);
  if (description) {
    lines.push(
      ...description.split('\n').map((line) => ` * ${line}`.trimEnd()),
    );
  }
  if (method.documentationLink) {
    lines.push(` * @see ${sanitize(method.documentationLink)}`);
  }
  return lines.length > 0 ? `/**\n${lines.join('\n')}\n */\n` : '';
}
