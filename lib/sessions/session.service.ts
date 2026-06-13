import { Inject, Injectable, Optional } from '@nestjs/common';

import { getAmbient, setAmbient } from '../ambient';
import { TelegramExecutionContext } from '../engine/context';
import { Providers } from '../providers';
import { defaultSessionKey } from './session-key';
import { MemorySessionStore } from './memory-session-store';
import { SESSION, SESSION_BINDING } from './session.constants';
import { SessionStore } from './session-store';
import type { SessionOptions } from './session.types';

interface SessionBinding {
  key: string;
  store: SessionStore;
}

/**
 * Loads a session into the ambient store before matching and persists it after
 * a successful handler — driven by {@link SessionStage} (load before matching so
 * a future FSM can route on state). Provided by `SessionModule`; the behaviour
 * is fully driven by the swappable config, and both are no-ops when its config
 * is absent.
 *
 * No per-key locking (v1): the load → mutate → save cycle isn't atomic, so two
 * updates for the SAME key processed concurrently can lose a write (last save
 * wins). Polling is sequential so it's safe there; the webhook source dispatches
 * concurrently, so a per-chat serialization or optimistic concurrency is a
 * future improvement.
 */
@Injectable()
export class SessionManager {
  private readonly fallbackStore = new MemorySessionStore();

  constructor(
    @Optional()
    @Inject(Providers.SESSION_OPTIONS)
    private readonly config?: SessionOptions,
  ) {}

  async load(ctx: TelegramExecutionContext): Promise<void> {
    const config = this.config;
    if (!config) {
      return;
    }

    const key = (config.key ?? defaultSessionKey)(ctx);
    if (key === undefined) {
      return;
    }

    const store = config.store ?? this.fallbackStore;
    const existing = await store.get(key);
    const session = existing ?? config.defaults?.() ?? {};

    setAmbient(SESSION, session);
    setAmbient(SESSION_BINDING, { key, store } satisfies SessionBinding);
  }

  async save(): Promise<void> {
    const binding = getAmbient<SessionBinding>(SESSION_BINDING);
    if (!binding) {
      return;
    }
    // Re-read from the ambient store (not a captured value) on purpose: a
    // handler may have reassigned the session object, not just mutated it.
    await binding.store.set(binding.key, getAmbient(SESSION));
  }
}
