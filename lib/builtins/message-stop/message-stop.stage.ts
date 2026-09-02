import { Injectable, Logger } from '@nestjs/common';

import { TelegramExecutionContext } from '../../engine/context';
import { UpdateKind } from '../../engine/context/update-kind';
import {
  BuiltinStageOrder,
  UpdateStage,
} from '../../engine/dispatcher/update-stage';

/**
 * Ends the live stream a user pressed stop on — the other half of
 * `streamMessage(..., { canStop: true })`.
 *
 * The stop arrives as its own update, with no call stack joining it to the
 * handler that is mid-stream, so this matches it back by chat and `draft_id`.
 * Without it `canStop` would draw a button that does nothing.
 *
 * A STAGE, not a `@Router` — stages all run, routes are first-match-wins. As a
 * route this would have competed with the user's own
 * `@OnMessageGenerationStopped()` handler and silently won or lost, depending on
 * discovery order: either their handler never runs, or the stream never stops.
 * As a stage it claims nothing, and their handler routes normally afterwards.
 */
@Injectable()
@UpdateStage({
  order: BuiltinStageOrder.MessageStop,
  // No route binds this kind, so without declaring it here Telegram would never
  // be asked for the press and the stop button would be decorative.
  kinds: [UpdateKind.MessageGenerationStopped],
})
export class MessageStopStage implements UpdateStage {
  private static readonly logger = new Logger(MessageStopStage.name);

  /**
   * A miss is normal once (the press races the final token) but a PATTERN of
   * misses means the stops are arriving at a process that isn't streaming —
   * several instances behind one webhook. Warn on the first one and never
   * again: silence hides a stop button that does nothing, and warning every
   * time turns a benign race into log noise.
   */
  private warnedOnMiss = false;

  apply(ctx: TelegramExecutionContext): void {
    const stopped = ctx.update.stopped_message_generation;
    if (stopped === undefined) {
      return;
    }
    // Through `ctx.bot`, not an injected one: the public door this built-in
    // tells authors to use, and — with several bots in one app — the bot the
    // update actually arrived on, which an injected singleton could not know.
    if (ctx.bot.stopStream(stopped.chat.id, stopped.draft_id)) {
      return;
    }
    if (!this.warnedOnMiss) {
      this.warnedOnMiss = true;
      MessageStopStage.logger.warn(
        `No live stream for draft ${stopped.draft_id} in chat ${stopped.chat.id}. ` +
          'Harmless if the user pressed stop as the stream ended. If it repeats, ' +
          'this process is not the one streaming — with several instances behind ' +
          'one webhook, forward the stop yourself and call bot.stopStream(chat_id, ' +
          'draft_id) on each. Logged once.',
      );
      return;
    }
    MessageStopStage.logger.debug(
      `No live stream for draft ${stopped.draft_id} in chat ${stopped.chat.id}.`,
    );
  }
}
