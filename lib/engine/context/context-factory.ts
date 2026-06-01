import { Injectable } from '@nestjs/common';

import { BotService } from '../../api';
import { RawUpdate } from '../../types/raw-update.types';
import { EventFactory } from './event-factory';
import { TelegramExecutionContext } from './telegram-execution-context';
import { resolveKind } from './update-kind';

/**
 * Wraps a raw update in a `TelegramExecutionContext`, once per update.
 *
 * Returns `null` for an update whose kind is not recognised — the caller skips
 * it (no handler can match an unknown update).
 */
@Injectable()
export class ContextFactory {
  constructor(
    private readonly botService: BotService,
    private readonly eventFactory: EventFactory,
  ) {}

  wrap(update: Readonly<RawUpdate>): TelegramExecutionContext | null {
    const kind = resolveKind(update);
    if (kind === null) {
      return null;
    }

    return new TelegramExecutionContext(
      update,
      kind,
      this.botService,
      this.eventFactory,
    );
  }
}
