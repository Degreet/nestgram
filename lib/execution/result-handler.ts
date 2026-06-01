import { Injectable, Logger } from '@nestjs/common';

import { TelegramExecutionContext } from '../context/telegram-execution-context';
import { TelegramEvent } from '../context/event-factory';
import { isCommand } from './command.types';

/** An event that can reply to itself (e.g. `Message.answer`). */
interface Answerable {
  answer(text: string): Promise<unknown>;
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

    if (isCommand(result)) {
      await result.fetch();
    }
  }

  private isAnswerable(
    event: TelegramEvent,
  ): event is TelegramEvent & Answerable {
    return typeof (event as Answerable).answer === 'function';
  }
}
