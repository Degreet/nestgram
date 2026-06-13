import { Injectable, Logger } from '@nestjs/common';

import { TelegramExecutionContext } from '../context/telegram-execution-context';
import { TelegramEvent } from '../context/event-factory';
import { ApiMethod } from '../../api/methods';

/** An event that can reply to itself (e.g. `Message.answer`). */
interface Answerable {
  answer(text: string): Promise<unknown>;
}

/**
 * Applies the return-value contract for handlers, after the invoker returns:
 *   - `string`       -> reply that string to the same chat
 *   - command object -> execute it (the pure-data `new SendMessage(...)` layer
 *                       beneath `message.answer(...)` sugar)
 *   - anything else  -> noop
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

    if (result instanceof ApiMethod) {
      // The bot that received this update — not a global default — so a returned
      // command object (new SendMessage(...)) goes out through the right bot.
      await ctx.bot.call(result);
    }
  }

  private isAnswerable(
    event: TelegramEvent,
  ): event is TelegramEvent & Answerable {
    return typeof (event as Answerable).answer === 'function';
  }
}
