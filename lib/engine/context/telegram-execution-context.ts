import { ArgumentsHost } from '@nestjs/common';

import { BotService } from '../../api';
import { User } from '../../events/user';
import { Message } from '../../events/message';
import { RawChat, RawUpdate } from '../../events/raw-update.types';
import { extractChat, extractSender } from '../execution/extractors';
import { EventFactory, TelegramEvent } from './event-factory';
import { EventState } from './event-state';
import { UpdateKind } from './update-kind';

/**
 * Immutable wrapper around a raw Telegram update.
 *
 * Carries the resolved update kind and a lazily-built, cached rich event
 * alongside the raw payload, which is exposed `Readonly` and never written to.
 *
 * This is the execution context the rest of the pipeline reads: guards, param
 * decorators and matchers reach it via `TelegramExecutionContext.of(ctx)`.
 */
export class TelegramExecutionContext {
  private cachedEvent?: TelegramEvent;

  /**
   * Per-update store: write/read your own flags or context anywhere in the
   * pipeline (also `@State()`). Lives for this update only, then is discarded.
   */
  readonly state: EventState = new Map();

  constructor(
    readonly update: Readonly<RawUpdate>,
    readonly kind: UpdateKind,
    private readonly botService: BotService,
    private readonly eventFactory: EventFactory,
  ) {}

  /** The rich, typed event, built once and cached on first access. */
  get event(): TelegramEvent {
    if (this.cachedEvent === undefined) {
      this.cachedEvent = this.eventFactory.build(
        this.update,
        this.kind,
        this.botService,
        this.state,
      );
    }

    return this.cachedEvent;
  }

  /** The user who triggered the update, when one is present. */
  get from(): User | undefined {
    return extractSender(this);
  }

  /**
   * The rich {@link Message} when this update is a message-family update
   * (message / edited / channel post / business / guest); `undefined` otherwise.
   *
   * The rich counterpart to reaching into `update.message` raw — a custom route
   * predicate gets the same typed event a handler would, entity sugar
   * (`message.hasEntity(...)`) and reply helpers included. Reuses the cached
   * `event`, so touching it here doesn't build a second one.
   */
  get message(): Message | undefined {
    return this.event instanceof Message ? this.event : undefined;
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
   * Read the Nestgram execution context out of a Nest `ArgumentsHost`.
   *
   * The engine invokes handlers as `invoker(event, ctx)`, so the wrapper is at
   * argument index 1. Accepts the broader `ArgumentsHost` (the supertype of
   * `ExecutionContext`) so an exception filter — which receives an
   * `ArgumentsHost`, not a full `ExecutionContext` — can read the same wrapper.
   */
  static of(host: ArgumentsHost): TelegramExecutionContext {
    return host.getArgByIndex(1);
  }
}
