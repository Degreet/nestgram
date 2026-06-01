import { ExecutionContext } from '@nestjs/common';

import { BotService } from '../../api';
import { User } from '../../events/user';
import { RawChat, RawUpdate } from '../../events/raw-update.types';
import { extractChat, extractSender } from '../execution/extractors';
import { EventFactory, TelegramEvent } from './event-factory';
import { UpdateKind } from './update-kind';

/**
 * Immutable wrapper around a raw Telegram update.
 *
 * Replaces the legacy `mutateUpdateObject` approach: instead of writing
 * `_updateType` / `_telegramObject` back onto the payload, the engine carries
 * the resolved kind and a lazily-built, cached rich event here. The raw update
 * is exposed `Readonly` and never written to.
 *
 * This is also the public execution context the docs reference: guards, param
 * decorators and filters reach it via `TelegramExecutionContext.of(ctx)`.
 */
export class TelegramExecutionContext {
  private cachedEvent?: TelegramEvent;

  constructor(
    readonly update: Readonly<RawUpdate>,
    readonly kind: UpdateKind,
    private readonly botService: BotService,
    private readonly eventFactory: EventFactory,
  ) {}

  /** The rich, typed event (built once, cached; nothing is written to `update`). */
  get event(): TelegramEvent {
    if (this.cachedEvent === undefined) {
      this.cachedEvent = this.eventFactory.build(
        this.update,
        this.kind,
        this.botService,
      );
    }

    return this.cachedEvent;
  }

  /** The user who triggered the update, when one is present. */
  get from(): User | undefined {
    return extractSender(this);
  }

  /** The chat the update happened in, when one is present. */
  get chat(): RawChat | undefined {
    return extractChat(this);
  }

  /** The resolved update kind (alias of `kind`, matching the docs' `type`). */
  get type(): UpdateKind {
    return this.kind;
  }

  /** The bot service the event actions / command objects use. */
  get bot(): BotService {
    return this.botService;
  }

  /**
   * Read the Nestgram execution context out of a Nest `ExecutionContext`.
   *
   * The engine invokes handlers as `invoker(event, ctx)`, so the wrapper is at
   * argument index 1.
   */
  static of(context: ExecutionContext): TelegramExecutionContext {
    return context.getArgByIndex(1);
  }
}
