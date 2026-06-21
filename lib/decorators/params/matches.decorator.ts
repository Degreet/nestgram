import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { TelegramExecutionContext } from '../../engine/context';
import { isRegexMatchSource } from '../../engine/matching';
import { ListenerOptions } from '../listener-options';
import { Metadata } from '../metadata.enum';

/**
 * Injects the whole `RegExpMatchArray` captured by a regex `@Hears`/`@Action`,
 * so positional groups are read by index:
 *
 * ```ts
 * @Hears(/^add (\d+) (.+)$/)
 * add(message: Message, @Matches() match: RegExpMatchArray) {
 *   const amount = Number(match[1]);
 *   const note = match[2];
 * }
 * ```
 *
 * `match[0]` is the whole match, `match[1..]` the positional groups,
 * `match.groups` the named ones. For a NAMED group prefer `@Param('amount')` —
 * it reads `match.groups.amount` and runs a per-parameter pipe, exactly like a
 * `@Command('add :amount')` segment.
 *
 * Extraction runs against the regex of the handler that actually matched, so a
 * sibling route the matcher only evaluated never bleeds in. `undefined` when the
 * handler matched through a non-regex route (a string `@Hears`/`@Action`, a
 * `@Command`, or a custom predicate) — there is no match to read there.
 */
export const Matches = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const tgCtx = TelegramExecutionContext.of(ctx);
    const listeners: ListenerOptions[] =
      Reflect.getMetadata(Metadata.LISTENERS, ctx.getHandler()) ?? [];

    // The first regex route that matched wins — a handler carries at most one
    // capturing route predicate (extra predicates only narrow).
    for (const listener of listeners) {
      for (const predicate of listener.predicates ?? []) {
        if (!isRegexMatchSource(predicate)) {
          continue;
        }
        const match = predicate.extractMatch(tgCtx);
        if (match !== null) {
          return match;
        }
      }
    }

    return undefined;
  },
);
