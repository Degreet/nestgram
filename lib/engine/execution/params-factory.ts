import { ParamsFactory } from '@nestjs/core';

/**
 * Nest `ParamsFactory` for Telegram handlers.
 *
 * `ExternalContextCreator` only resolves params when a `ParamsFactory` is
 * supplied, so this object must be passed even though it has no per-type logic
 * of its own. With it in place, ECC runs each parameter's stored
 * `createParamDecorator` factory (see `lib/decorators/params/*`), which is where
 * Nestgram's values are actually derived.
 *
 * It returns `null` for the standard numeric param types so undecorated slots
 * resolve to nothing rather than crashing.
 */
export class NestgramParamsFactory implements ParamsFactory {
  exchangeKeyForValue(): null {
    return null;
  }
}
