import { Inject, Injectable, Optional } from '@nestjs/common';

import { setAmbient } from '../ambient';
import { TelegramExecutionContext } from '../engine/context';
import { Providers } from '../providers';
import { defaultConversationKey, MemoryStore } from '../store';
import {
  FIRST_STEP,
  SCENES,
  SCENES_BINDING,
  SCENES_NAMESPACE,
} from './scenes.constants';
import { SceneRegistry } from './scene.registry';
import type {
  SceneBinding,
  SceneSnapshot,
  ScenesOptions,
} from './scenes.types';

/**
 * Loads the scene record into the ambient store before matching — so the step
 * predicate can route on the active scene+step and a handler can navigate via
 * `@SceneCtx()`. Driven by {@link SceneStage}; a no-op when its config is absent.
 * Mirrors {@link FsmService}, with no `commit`: {@link SceneContext} writes
 * transitions through immediately rather than on commit.
 *
 * Same no-locking caveat as sessions/FSM: concurrent updates for one key can race
 * a transition (last write wins). Fine for sequential polling.
 */
@Injectable()
export class SceneService {
  private readonly fallbackStore = new MemoryStore();

  constructor(
    private readonly registry: SceneRegistry,
    @Optional()
    @Inject(Providers.SCENES_OPTIONS)
    private readonly config?: ScenesOptions,
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
    const key = `${SCENES_NAMESPACE}${conversationKey}`;
    const existing = (await store.get(key)) as SceneSnapshot | undefined;
    const snapshot: SceneSnapshot = existing ?? {
      active: null,
      step: FIRST_STEP,
      data: {},
      stack: [],
    };

    setAmbient(SCENES, snapshot);
    setAmbient(SCENES_BINDING, {
      key,
      store,
      ctx,
      runner: this.registry,
    } satisfies SceneBinding);
  }
}
