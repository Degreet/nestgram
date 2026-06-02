import { Injectable } from '@nestjs/common';

import { BotService } from '../../api';
import { TelegramObject } from '../../events';
import { getTelegramObjectByUpdateType } from '../../decorators';
import { RawUpdate } from '../../events/raw-update.types';
import { EventState } from './event-state';
import { UpdateKind } from './update-kind';

/**
 * The rich, typed event handed to a handler as its positional first argument
 * (e.g. `Message`, `CallbackQuery`). Falls back to the raw payload when no rich
 * class is registered for the kind.
 */
export type TelegramEvent = TelegramObject | Record<string, unknown>;

/**
 * Builds the rich event for an update by looking the kind up in the existing
 * `@UpdateType` registry, so adding new event types stays declarative (decorate
 * the class with `@UpdateType(...)` — no switch to edit here).
 *
 * The rich event is constructed by `Object.assign`-ing the raw payload onto a
 * fresh instance; the raw update object is never mutated.
 */
@Injectable()
export class EventFactory {
  build(
    update: Readonly<RawUpdate>,
    kind: UpdateKind,
    botService: BotService,
    state: EventState,
  ): TelegramEvent {
    const Ctor = getTelegramObjectByUpdateType(kind);
    const raw = update[kind] as unknown as Record<string, unknown>;

    // The extra `state` arg is used by events whose actions record into the
    // per-update store (e.g. CallbackQuery.answer); others ignore it.
    return Ctor ? new Ctor(botService, raw, state) : raw;
  }
}
