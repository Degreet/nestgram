import { Injectable, Logger } from '@nestjs/common';

import { BotService } from '../../api';
import { RawUpdate } from '../../events/raw-update.types';
import { EventFactory } from './event-factory';
import { TelegramExecutionContext } from './telegram-execution-context';
import { resolveKind, unmodelledKind } from './update-kind';

/**
 * Wraps a raw update in a `TelegramExecutionContext`, once per update.
 *
 * Returns `null` for an update whose kind is not recognised — the caller skips
 * it (no handler can match an unknown update). A field newer than `UpdateKind`
 * (a future Bot API addition) is surfaced with a one-off warning rather than
 * dropped silently, so it never goes unnoticed.
 */
@Injectable()
export class ContextFactory {
  private readonly logger = new Logger(ContextFactory.name);
  private readonly warnedKinds = new Set<string>();

  constructor(
    private readonly botService: BotService,
    private readonly eventFactory: EventFactory,
  ) {}

  wrap(update: Readonly<RawUpdate>): TelegramExecutionContext | null {
    const kind = resolveKind(update);
    if (kind === null) {
      this.warnUnmodelled(update);
      return null;
    }

    return new TelegramExecutionContext(
      update,
      kind,
      this.botService,
      this.eventFactory,
    );
  }

  /** Warn once per unmodelled kind so a new Bot API update type is visible. */
  private warnUnmodelled(update: Readonly<RawUpdate>): void {
    const kind = unmodelledKind(update);
    if (kind === null || this.warnedKinds.has(kind)) {
      return;
    }

    this.warnedKinds.add(kind);
    this.logger.warn(
      `Received an update of kind '${kind}' that this Nestgram version does not ` +
        `model yet — it was not routed. Upgrade Nestgram to handle it. ` +
        `(Logged once per kind.)`,
    );
  }
}
