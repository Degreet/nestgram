import { getAmbient } from '../ambient';
import { NestgramError } from '../exceptions';
import { currentSnapshot } from './scene.ambient';
import { FIRST_STEP, SCENES_BINDING } from './scenes.constants';
import type {
  ActiveSceneSnapshot,
  SceneBinding,
  SceneClass,
  SceneSnapshot,
} from './scenes.types';

/**
 * The handler-facing scene API — the scene analog of `FsmContext`, reached via
 * `@SceneCtx()` (or the `scene()` free function in services/guards). Navigation
 * (`next`/`back`/`goto`/`enter`/`leave`) and data (`data`/`update`/`setData`) are
 * write-through to the store, mirroring `FsmContext`: a move survives a later send
 * failure in the handler.
 *
 * Navigation methods resolve to their `reply` argument, so a handler ends with
 * `return scene.next('Next question?')` and the framework's return-value contract
 * replies it. `enter` instead resolves to the entered scene's `@OnEnter` reply,
 * so `return scene.enter(SubScene)` shows the sub-dialog's first prompt.
 *
 * Reads degrade gracefully when scenes are off or the update has no chat
 * (`current()` → null, `data()` → `{}`); a transition then throws, because a
 * silently dropped move is a debugging trap.
 */
export class SceneContext<TData = Record<string, unknown>> {
  /** The active scene + step, or `null` when no scene is running. */
  current(): { scene: string; step: number } | null {
    const snapshot = currentSnapshot();
    if (!snapshot || snapshot.active === null) {
      return null;
    }
    return { scene: snapshot.active, step: snapshot.step };
  }

  /** The data gathered so far — partial, since a scene fills it step by step. */
  data(): Partial<TData> {
    return (currentSnapshot()?.data ?? {}) as Partial<TData>;
  }

  /** Merge a patch into the active scene's data. */
  async update(patch: Partial<TData>): Promise<void> {
    const snapshot = this.require();
    Object.assign(snapshot.data, patch);
    await this.persist(snapshot);
  }

  /** Replace the active scene's data wholesale. */
  async setData(data: TData): Promise<void> {
    const snapshot = this.require();
    snapshot.data = data as Record<string, unknown>;
    await this.persist(snapshot);
  }

  /** Advance one step; resolves to `reply` for the return-value contract. */
  async next(reply?: string): Promise<string | void> {
    return this.move(this.requireStep() + 1, reply);
  }

  /** Go back one step (never before the first); resolves to `reply`. */
  async back(reply?: string): Promise<string | void> {
    return this.move(this.requireStep() - 1, reply);
  }

  /** Jump to a step by ordinal or step-method name; resolves to `reply`. */
  async goto(step: number | string, reply?: string): Promise<string | void> {
    const snapshot = this.require();
    const ordinal = this.requireBinding().runner.ordinalOf(
      snapshot.active,
      step,
    );
    return this.move(ordinal, reply);
  }

  /**
   * Enter a (sub-)scene: push the current scene onto the stack (when one is
   * active), set the new scene at its first step, run its `@OnEnter`, and resolve
   * to that hook's reply — so `return scene.enter(SubScene)` shows its first
   * prompt. Optional `data` seeds the new scene's ephemeral data.
   */
  async enter(
    scene: SceneClass,
    data: Partial<TData> = {},
  ): Promise<string | void> {
    const binding = this.requireBinding();
    // `enter` is the one mutating call that does NOT need an active scene — it is
    // how a router starts one — so it reads the always-seeded snapshot directly.
    const snapshot = this.loadedSnapshot();
    const sceneId = binding.runner.idOf(scene);

    if (snapshot.active !== null) {
      // Resume the parent at the step AFTER the one that spawned the sub-dialog,
      // so its entering step (`return scene.enter(child)`) is not re-run on the
      // child's `leave`. Clamped to the parent's last step.
      const resumeStep = this.clamp(
        snapshot.step + 1,
        binding.runner.stepCount(snapshot.active),
      );
      snapshot.stack.push({
        scene: snapshot.active,
        step: resumeStep,
        data: snapshot.data,
      });
    }
    snapshot.active = sceneId;
    snapshot.step = FIRST_STEP;
    snapshot.data = { ...data };
    await this.persist(snapshot);

    return binding.runner.runEnter(sceneId, binding.ctx);
  }

  /**
   * Leave the active scene: run its `@OnLeave`, wipe its data, then pop a parent
   * scene back into place if one is on the stack (else go idle). Resolves to
   * `reply` (the leave's own message), not the `@OnLeave` return value.
   */
  async leave(reply?: string): Promise<string | void> {
    const binding = this.requireBinding();
    const active = this.require();
    const leaving = active.active;
    // Widen to the base shape: leaving with an empty stack resets `active` to
    // `null`, which the active-narrowed type forbids.
    const snapshot: SceneSnapshot = active;

    await binding.runner.runLeave(leaving, binding.ctx);

    const parent = snapshot.stack.pop();
    if (parent) {
      snapshot.active = parent.scene;
      snapshot.step = parent.step;
      snapshot.data = parent.data;
      await this.persist(snapshot);
    } else {
      snapshot.active = null;
      snapshot.step = FIRST_STEP;
      snapshot.data = {};
      snapshot.stack = [];
      // Clear the record rather than persisting an empty one, so an idle
      // conversation stores nothing — same discipline as `FsmContext.clear`.
      await binding.store.delete(binding.key);
    }

    return reply;
  }

  /** Move to `ordinal`, clamped to the scene's step range; resolves to `reply`. */
  private async move(ordinal: number, reply?: string): Promise<string | void> {
    const binding = this.requireBinding();
    const snapshot = this.require();
    snapshot.step = this.clamp(
      ordinal,
      binding.runner.stepCount(snapshot.active),
    );
    await this.persist(snapshot);
    return reply;
  }

  private clamp(ordinal: number, stepCount: number): number {
    const lastStep = stepCount - 1;
    if (ordinal < FIRST_STEP) {
      return FIRST_STEP;
    }
    return ordinal > lastStep ? lastStep : ordinal;
  }

  /** The snapshot the stage seeded (always present once the binding exists). */
  private loadedSnapshot(): SceneSnapshot {
    const snapshot = currentSnapshot();
    if (!snapshot) {
      throw new NestgramError(
        'Scene snapshot missing — the scene stage did not run for this update.',
      );
    }
    return snapshot;
  }

  private requireStep(): number {
    return this.require().step;
  }

  private binding(): SceneBinding | undefined {
    return getAmbient<SceneBinding>(SCENES_BINDING);
  }

  private requireBinding(): SceneBinding {
    const binding = this.binding();
    if (!binding) {
      throw new NestgramError(
        'Scenes are not available for this update — is ScenesModule imported, ' +
          'and does the update have a chat to scope to?',
      );
    }
    return binding;
  }

  private require(): ActiveSceneSnapshot {
    this.requireBinding();
    const snapshot = currentSnapshot();
    if (!snapshot || snapshot.active === null) {
      throw new NestgramError(
        'No active scene — enter one with `scene.enter(SomeScene)` before ' +
          'navigating or updating scene data.',
      );
    }
    return snapshot as ActiveSceneSnapshot;
  }

  private async persist(snapshot: SceneSnapshot): Promise<void> {
    const binding = this.binding();
    if (binding) {
      await binding.store.set(binding.key, snapshot);
    }
  }
}

// Stateless — reads the ambient binding on every call — so one shared instance
// serves every handler; the generic is a type-only view.
const sharedContext = new SceneContext();

/**
 * The current update's scene context — a free function reachable anywhere in the
 * update's call chain (services, guards), the same ambient bargain as `fsm()` /
 * `t()`. `@SceneCtx()` is sugar over this for handler params.
 */
export function scene<TData = Record<string, unknown>>(): SceneContext<TData> {
  return sharedContext as SceneContext<TData>;
}
