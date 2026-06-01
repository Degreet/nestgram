import { ParamsFactory } from '@nestjs/core';

/**
 * Nest `ParamsFactory` for Telegram handlers.
 *
 * `ExternalContextCreator` only resolves params when a `ParamsFactory` is
 * supplied — its resolution is all-or-nothing, gated on this object being
 * present (ECC-NOTES.md). With it supplied, ECC runs each parameter's
 * stored `createParamDecorator` factory (see `lib/decorators/params/*`), which
 * is where Nestgram's values are derived.
 *
 * This factory therefore needs no per-type logic of its own: the engine's param
 * decorators are `createParamDecorator`-based and read straight off the
 * execution context. It returns `null` for the standard numeric param types so
 * undecorated slots resolve to nothing rather than crashing.
 */
export class NestgramParamsFactory implements ParamsFactory {
  exchangeKeyForValue(): null {
    return null;
  }
}
