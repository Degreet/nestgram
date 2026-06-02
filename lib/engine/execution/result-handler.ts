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
 * Applies the return-value contract for handlers, after the invoker returns:
 *   - `string`         -> reply that string to the same chat
 *   - command object   -> execute it (`.fetch()`)
 *   - anything else    -> noop
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
   * Duck-types on `fetch`: a plain object a handler returns will not have it.
   * A structural check (rather than `instanceof ApiMethod`) is used because
   * `ApiMethod` is an abstract class merged with a same-named interface, which
   * does not import cleanly as a value.
   */
  private isCommand(value: unknown): value is Command {
    return (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as Command).fetch === 'function'
    );
  }
}
