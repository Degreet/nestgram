import { Metadata } from '../decorators/metadata.enum';

/**
 * The scene-lifecycle phases a hook can bind to. Enter+leave only for now;
 * pause/resume (around a pushed sub-dialog) can join later without changing the
 * decorator surface.
 */
export enum SceneLifecycle {
  Enter = 'enter',
  Leave = 'leave',
}

const defineLifecycle =
  (phase: SceneLifecycle): MethodDecorator =>
  (_target, _key, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(Metadata.SCENE_LIFECYCLE, phase, descriptor.value);
  };

/**
 * Runs when the scene is entered — the place to show the first prompt. Unlike an
 * `@On*` listener it is not triggered by an update; the engine fires it on
 * `enter`, and its returned string is replied (so `return 'What is your name?'`):
 *
 * ```ts
 * @OnEnter() start() { return 'What is your name?'; }
 * ```
 */
export const OnEnter = (): MethodDecorator =>
  defineLifecycle(SceneLifecycle.Enter);

/**
 * Runs when the scene is left (`scene.leave()` or a parent `leave` unwinding the
 * stack), after its data is wiped — for side effects (persist a result, clear a
 * keyboard). A returned value is ignored; the reply, if any, is the argument to
 * `scene.leave(reply)`.
 */
export const OnLeave = (): MethodDecorator =>
  defineLifecycle(SceneLifecycle.Leave);

/** The lifecycle phase a method is a hook for, or `undefined` if it is not one. */
export function lifecycleOf(method: object): SceneLifecycle | undefined {
  return Reflect.getMetadata(Metadata.SCENE_LIFECYCLE, method);
}
