import { Inject, Injectable, Optional } from '@nestjs/common';

import { getAmbient, setAmbient } from '../../ambient';
import { TelegramExecutionContext } from '../../engine/context';
import { Providers } from '../../providers';
import type { SessionOptions } from '../../sessions/session.types';
import { MemoryStore } from '../../store/key-value-store';
import type { KeyValueStore } from '../../store/key-value-store';
import type { NestgramModuleOptions } from '../../module/nestgram-module.types';
import {
  DEFAULT_KEYBOARD_STATE_TTL_MS,
  KEYBOARD_STATE,
  KEYBOARD_STATE_BINDING,
} from './keyboard-state.constants';
import { keyboardStateKey } from './keyboard-state-key';
import type { KeyboardState } from './keyboard-state.types';

interface KeyboardStateBinding {
  key: string;
  store: KeyValueStore;
}

/**
 * Loads a message's keyboard state into the ambient store before matching and
 * persists it after a successful handler — driven by {@link KeyboardStateStage},
 * mirroring how sessions load and save. Unlike sessions it is always on (no
 * import): a live keyboard needs somewhere to keep its selection, and the
 * built-in checkbox group reads/writes it through the ambient rail.
 *
 * Only a callback that carries a message has a key, so a plain message never loads
 * or creates state — the first tap brings a keyboard's state to life.
 */
@Injectable()
export class KeyboardStateService {
  private readonly fallbackStore = new MemoryStore(
    DEFAULT_KEYBOARD_STATE_TTL_MS,
  );

  constructor(
    @Optional()
    @Inject(Providers.NESTGRAM_OPTIONS)
    private readonly options?: NestgramModuleOptions,
    @Optional()
    @Inject(Providers.SESSION_OPTIONS)
    private readonly session?: SessionOptions,
  ) {}

  async load(ctx: TelegramExecutionContext): Promise<void> {
    const key = keyboardStateKey(ctx);
    if (key === undefined) {
      return;
    }
    const store = this.resolveStore();
    const existing = (await store.get(key)) as KeyboardState | undefined;
    const state: KeyboardState = existing ?? {};

    setAmbient(KEYBOARD_STATE, state);
    setAmbient(KEYBOARD_STATE_BINDING, {
      key,
      store,
    } satisfies KeyboardStateBinding);
  }

  async save(): Promise<void> {
    const binding = getAmbient<KeyboardStateBinding>(KEYBOARD_STATE_BINDING);
    if (!binding) {
      return;
    }
    // Re-read from the ambient store (not a captured value): a handler may have
    // reassigned the state object, not just mutated it — mirrors sessions.
    await binding.store.set(binding.key, getAmbient(KEYBOARD_STATE));
  }

  // Explicit override → the session store's backend (so a Redis session setup
  // makes keyboards highload-safe for free, under the separate `kbd:` keyspace)
  // → the in-process memory fallback. Cheap to resolve per load.
  private resolveStore(): KeyValueStore {
    return (
      this.options?.keyboardState?.store ??
      this.session?.store ??
      this.fallbackStore
    );
  }
}
