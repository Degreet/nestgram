import { Injectable } from '@nestjs/common';
import { ExternalContextCreator, ModuleRef } from '@nestjs/core';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';

import { TelegramExecutionContext } from '../context/telegram-execution-context';
import { NESTGRAM_CONTEXT_TYPE } from './context-type';
import { NestgramParamsFactory } from './params-factory';

export type HandlerInvoker = (
  ctx: TelegramExecutionContext,
) => Promise<unknown>;

/**
 * Builds a per-handler invoker via `ExternalContextCreator`, ONCE at boot.
 *
 * The returned invoker runs the handler through the full Nest pipeline
 * (guards -> interceptors -> pipes -> handler -> exception filters), exactly as
 * an HTTP route would. The call signature follows ECC-NOTES.md's "minimal
 * correct call": a real `ParamsFactory` is required, and the invoker is fed
 * `(event, ctx)` so param decorators read `args[0]` (event) / `args[1]` (ctx).
 *
 * `ExternalContextCreator` lives in Nest's `InternalCoreModule`, not in our
 * module's context, so it can't be constructor-injected directly. We resolve it
 * lazily and memoized via `ModuleRef` (`strict: false` searches the whole
 * container) on first `create()`, which only runs at bootstrap — after the
 * container is initialised, so the lookup is safe.
 *
 * Takes the router instance directly (the route table carries instances, not
 * `InstanceWrapper`s). The inquirer id is omitted: routers are singletons for
 * now (Q-SCOPE), so there is no request-scoped inquirer to thread through.
 */
@Injectable()
export class HandlerExecutorFactory {
  private readonly paramsFactory = new NestgramParamsFactory();
  private externalContextCreator?: ExternalContextCreator;

  constructor(private readonly moduleRef: ModuleRef) {}

  create(instance: object, methodName: string): HandlerInvoker {
    const callback = (instance as Record<string, unknown>)[methodName];

    const invoker = this.ecc().create(
      instance,
      callback as (...args: unknown[]) => unknown,
      methodName,
      ROUTE_ARGS_METADATA,
      this.paramsFactory,
      undefined,
      undefined,
      undefined,
      NESTGRAM_CONTEXT_TYPE,
    );

    return (ctx: TelegramExecutionContext) => invoker(ctx.event, ctx);
  }

  private ecc(): ExternalContextCreator {
    if (!this.externalContextCreator) {
      this.externalContextCreator = this.moduleRef.get(ExternalContextCreator, {
        strict: false,
      });
    }
    return this.externalContextCreator;
  }
}
