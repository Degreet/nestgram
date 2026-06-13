import { Inject, Injectable, Optional } from '@nestjs/common';

import { setAmbient } from '../ambient';
import { TelegramExecutionContext } from '../engine/context';
import { Providers } from '../providers';
import { defaultConversationKey, MemoryStore } from '../store';
import { FSM, FSM_BINDING, FSM_NAMESPACE } from './fsm.constants';
import type { FsmBinding, FsmOptions, FsmSnapshot } from './fsm.types';

/**
 * Loads the FSM record into the ambient store before matching — so a `State`
 * predicate can route on it and a handler can read/transition it via `@Fsm()`.
 * Driven by {@link FsmStage}; a no-op when its config is absent. Mirrors
 * `SessionManager`, but has no `save`: `FsmContext` writes transitions through
 * immediately rather than on commit.
 *
 * No per-key locking (v1), same caveat as sessions: concurrent updates for one
 * key can race a transition (last write wins). Fine for sequential polling;
 * a future improvement for the concurrent webhook source.
 */
@Injectable()
export class FsmManager {
  private readonly fallbackStore = new MemoryStore();

  constructor(
    @Optional()
    @Inject(Providers.FSM_OPTIONS)
    private readonly config?: FsmOptions,
  ) {}

  async load(ctx: TelegramExecutionContext): Promise<void> {
    const config = this.config;
    if (!config) {
      return;
    }

    const conversationKey = (config.key ?? defaultConversationKey)(ctx);
    if (conversationKey === undefined) {
      return;
    }

    const store = config.store ?? this.fallbackStore;
    const key = `${FSM_NAMESPACE}${conversationKey}`;
    const existing = (await store.get(key)) as FsmSnapshot | undefined;
    const snapshot: FsmSnapshot = existing ?? { state: null, data: {} };

    setAmbient(FSM, snapshot);
    setAmbient(FSM_BINDING, { key, store } satisfies FsmBinding);
  }
}
