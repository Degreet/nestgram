import type { TelegramExecutionContext } from '../engine/context';
import type { KeyValueStore } from '../store';

/**
 * A scene class — a `@Scene('id')`-decorated constructor. Used as the handle a
 * handler passes to `scene.enter(RegistrationScene)`, resolved to its id via the
 * scene registry.
 */
export type SceneClass = new (...args: never[]) => object;

/**
 * One frame on the scene stack: a scene the user was in before entering a
 * sub-dialog, plus the step they paused on and the data gathered so far. Popped
 * back into place on `leave`.
 */
export interface SceneFrame {
  scene: string;
  step: number;
  data: Record<string, unknown>;
}

/**
 * The persisted per-conversation scene record: the active scene + step, the
 * ephemeral data for that scene, and the stack of parent scenes paused beneath
 * it. `active` is `null` when the user is in no scene.
 */
export interface SceneSnapshot {
  /** The active scene id, or `null` when no scene is running. */
  active: string | null;
  /** The active scene's current step ordinal (declaration order). */
  step: number;
  /** Ephemeral data for the active scene — wiped on `leave`. */
  data: Record<string, unknown>;
  /** Parent scenes paused beneath the active one (innermost last). */
  stack: SceneFrame[];
}

/** A scene snapshot known to have an active scene — what `require()` narrows to. */
export type ActiveSceneSnapshot = SceneSnapshot & { active: string };

/** The resolved key + store + runner of the current update's scene record (ambient). */
export interface SceneBinding {
  key: string;
  store: KeyValueStore;
  /** The current update's context, so lifecycle hooks run through the Nest pipeline. */
  ctx: TelegramExecutionContext;
  /** Runs a scene's `@OnEnter`/`@OnLeave` hooks; the registry behind the context. */
  runner: SceneLifecycleRunner;
}

/**
 * What {@link SceneContext} needs from the scene registry to drive lifecycle:
 * resolve a class to its id, count/validate steps, and run enter/leave hooks.
 * Narrowed to an interface so the context depends on the capability, not the
 * provider — and tests can stub it.
 */
export interface SceneLifecycleRunner {
  /** The scene id a `@Scene` class declares; throws if the class is not a scene. */
  idOf(scene: SceneClass): string;
  /** The number of `@Step()` methods in a scene — bounds `next`/`goto`. */
  stepCount(sceneId: string): number;
  /** Resolve a step reference (ordinal or step method name) to an ordinal. */
  ordinalOf(sceneId: string, step: number | string): number;
  /** Run a scene's `@OnEnter` hook, if any; resolves to its reply (or void). */
  runEnter(
    sceneId: string,
    ctx: TelegramExecutionContext,
  ): Promise<string | void>;
  /** Run a scene's `@OnLeave` hook, if any (side effects only). */
  runLeave(sceneId: string, ctx: TelegramExecutionContext): Promise<void>;
}

/** Options for `@Step()`. */
export interface SceneStepOptions {
  /**
   * Reprompt shown when the step's filter rejects the update (the user typed
   * something that doesn't match `@OnText()` / `@OnPhoto()` / …). Without it the
   * update is ignored and the user simply stays on the step.
   */
  invalid?: string;
}

/**
 * Scene configuration, passed to `ScenesModule.forRoot`. The store and key are
 * swappable — no privileged core. Point it at the same store as sessions/FSM to
 * share persistence.
 */
export interface ScenesOptions {
  /** Persistence. Default: a process-local `MemoryStore`. */
  store?: KeyValueStore;
  /**
   * Compute the scene key for an update. Default `defaultConversationKey`
   * (chat · user · forum topic · business connection). Return `undefined` to
   * skip scenes for this update.
   */
  key?: (ctx: TelegramExecutionContext) => string | undefined;
}
