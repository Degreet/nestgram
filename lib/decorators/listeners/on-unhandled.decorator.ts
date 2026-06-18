import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { TelegramExecutionContext } from '../../engine/context';
import { Metadata } from '../metadata.enum';
import { ensureFirstParamDecorated } from './ensure-first-param';

/**
 * Injected into an `@OnUnhandled` handler's first parameter: the raw update that
 * matched no route. Unlike `@Event` it is not a kind-resolved rich event — an
 * unhandled update can be of any kind, so the handler inspects the raw payload.
 *
 * The wrapper sits at argument index 1 (the engine invokes handlers as
 * `invoker(event, ctx)`); read it via the generic `getArgByIndex` so this
 * decorator imports the context only as a type — a runtime import would close a
 * `listeners -> context -> decorators -> listeners` module cycle.
 */
const UnhandledUpdate = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    ctx.getArgByIndex<TelegramExecutionContext>(1).update,
);

/**
 * Marks a router method as a handler for updates that matched **no** route.
 *
 * After the route table declines an update, the dispatcher runs every
 * `@OnUnhandled` handler through the full Nest pipeline (ECC) — guards and
 * interceptors apply, and a returned value replies, exactly like a normal
 * handler. The first parameter receives the raw update (any kind); decorate
 * later parameters as usual.
 *
 * All `@OnUnhandled` handlers run — they observe rather than compete, so there
 * is no first-match here; reply from at most one (a throw in one is isolated, so
 * it never starves the others). The built-in dead-button warning is itself an
 * `@OnUnhandled` handler a user could have written (no privileged core); silence
 * it with `warnUnhandledCallbacks: false`.
 *
 * They run through the full pipeline, so an unmatched `callback_query` is
 * auto-answered on success unless the handler opts out with `@NoAutoAnswer`.
 *
 * ```ts
 * @Router()
 * class FallbackRouter {
 *   @OnUnhandled()
 *   unhandled(update: RawUpdate) {
 *     this.metrics.miss(update.update_id);
 *   }
 * }
 * ```
 */
export const OnUnhandled = (): MethodDecorator => {
  return (
    target: object,
    key: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    Reflect.defineMetadata(Metadata.UNHANDLED, true, descriptor.value);
    ensureFirstParamDecorated(target, key, descriptor, UnhandledUpdate());
  };
};
