import { Injectable, Logger } from '@nestjs/common';

import { TelegramExecutionContext } from '../context/telegram-execution-context';
import { TelegramEvent } from '../context/event-factory';

/** An event that can reply to itself (e.g. `Message.answer`). */
interface Answerable {
  answer(text: string): Promise<unknown>;
}

/**
 * A command object the handler can return to be executed (the underlying layer
 * beneath `message.answer(...)` sugar). `SendMessage`/`SendPhoto`/... satisfy it
 * by extending `ApiMethod` and exposing `.fetch()`.
 */
interface Command {
  fetch(): Promise<unknown>;
}

/**
 * The return-value contract for handlers:
 *   - `string`         -> reply that string to the same chat
 *   - command object   -> execute it (`.fetch()`)
 *   - anything else    -> noop
 *
 * Centralises what the legacy path never actually did (it discarded the return
 * value). Runs after the handler invoker returns (Q-RESULT-LOC: after `invoke`).
 *
 * Non-string, non-command results are ignored silently — `return message.answer(...)`
 * is idiomatic (especially in arrow handlers) and has already sent the message,
 * so its resolved value is nothing for us to act on, not an error.
 */
@Injectable()
export class ResultHandler {
  private readonly logger = new Logger(ResultHandler.name);

  async handle(result: unknown, ctx: TelegramExecutionContext): Promise<void> {
    if (typeof result === 'string') {
      const event = ctx.event;
      if (this.isAnswerable(event)) {
        await event.answer(result);
      } else {
        this.logger.warn(
          `Handler for "${ctx.kind}" returned a string but its event has no answer()`,
        );
      }
      return;
    }

    if (this.isCommand(result)) {
      await result.fetch();
    }
  }

  private isAnswerable(
    event: TelegramEvent,
  ): event is TelegramEvent & Answerable {
    return typeof (event as Answerable).answer === 'function';
  }

  /**
   * Structural check on `fetch` (the loose, duck-typed variant): a plain object
   * a handler returns will not have it. The tight `instanceof ApiMethod` variant
   * is avoided because `ApiMethod` is an abstract class merged with a same-named
   * interface, which does not import cleanly as a value.
   */
  private isCommand(value: unknown): value is Command {
    return (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as Command).fetch === 'function'
    );
  }
}
