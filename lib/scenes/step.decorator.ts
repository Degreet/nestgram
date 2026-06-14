import { Match } from '../decorators/match.decorator';
import { Metadata } from '../decorators/metadata.enum';
import { ListenerOptions } from '../decorators/listener-options';
import { NestgramError } from '../exceptions';
import { StepPredicate } from './step.predicate';
import type { SceneStepOptions } from './scenes.types';

/** What `@Step()` records on a method for the scene registry to wire at boot. */
export interface StepMetadata {
  options: SceneStepOptions;
  /** The shared predicate the registry binds (scene id + ordinal) at boot. */
  predicate: StepPredicate;
}

/**
 * Declares a method as an ordered step of the enclosing `@Scene`. Steps are
 * auto-numbered by declaration order (no hand-wired state per step); the engine
 * gates each to "this scene is active AND this is the current step" via the same
 * `@Match` mechanism `FsmState` uses.
 *
 * Compose it with the update filters — `@Step() @OnText()` is a step that fires
 * only on a text message while the scene sits on that step. When the filter
 * rejects the update the user simply stays on the step; pass `invalid` to reply
 * a reprompt instead:
 *
 * ```ts
 * @Step({ invalid: 'Please send your name as text.' })
 * @OnText()
 * name(message: Message, @SceneCtx() scene: SceneContext) { ... }
 * ```
 */
export const Step = (options: SceneStepOptions = {}): MethodDecorator => {
  const predicate = new StepPredicate();
  const metadata: StepMetadata = { options, predicate };

  return (target, key, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(Metadata.SCENE_STEP, metadata, descriptor.value);
    // AND the scene+ordinal gate onto every route this method declares, just
    // like `@AnyState()` ANDs its predicate — composes with the step's `@On*`.
    Match(predicate)(target, key, descriptor);

    if (options.invalid !== undefined) {
      appendReprompt(descriptor.value, predicate, options.invalid);
    }
  };
};

/**
 * Adds a deferred static-reply listener for EACH update kind the step listens to,
 * gated on the same scene+ordinal but WITHOUT the step's own filter — so a step
 * input the strict route rejected (wrong content type) replies the reprompt
 * instead of being silently ignored. Marked `deferred`, so {@link RouteExplorer}
 * always sorts these after the strict routes regardless of decorator order.
 *
 * The kinds are mirrored from the strict listeners (so a `@OnCallbackQuery()`
 * step reprompts on a callback, a text step on a message), so the step's `@On*`
 * filter(s) must already have registered their `Metadata.LISTENERS` before this
 * runs. Decorators evaluate bottom-up: the `@On*` listener(s) below run first,
 * then `@Step()` above reads what they recorded to synthesize the deferred
 * reprompt. Hence `@Step()` must sit ABOVE its filter; if it sees no filter
 * (none below, or order reversed) it throws rather than silently doing nothing.
 */
function appendReprompt(
  method: object,
  predicate: StepPredicate,
  invalid: string,
): void {
  const existing: ListenerOptions[] =
    Reflect.getMetadata(Metadata.LISTENERS, method) ?? [];
  const strictKinds = [
    ...new Set(
      existing
        .filter((listener) => !listener.deferred)
        .map((listener) => listener.updateType),
    ),
  ];
  if (strictKinds.length === 0) {
    throw new NestgramError(
      '@Step({ invalid }) needs a filter to reprompt against — place @Step() ' +
        'ABOVE its @On* decorator (e.g. `@Step({ invalid }) @OnText()`).',
    );
  }

  const reprompts: ListenerOptions[] = strictKinds.map((updateType) => ({
    updateType,
    predicates: [predicate],
    reply: invalid,
    deferred: true,
  }));
  Reflect.defineMetadata(
    Metadata.LISTENERS,
    [...existing, ...reprompts],
    method,
  );
}

/** The `@Step()` metadata on a method, or `undefined` if it is not a step. */
export function stepMetadataOf(method: object): StepMetadata | undefined {
  return Reflect.getMetadata(Metadata.SCENE_STEP, method);
}
