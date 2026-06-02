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
 * Builds a per-handler invoker via `ExternalContextCreator`, once at boot.
 *
 * The returned invoker runs the handler through the full Nest pipeline
 * (guards -> interceptors -> pipes -> handler -> exception filters), exactly as
 * an HTTP route would. A `ParamsFactory` must be supplied for ECC to resolve
 * params at all, and the invoker is fed `(event, ctx)` so param decorators read
 * the event at `args[0]` and the execution context at `args[1]`.
 *
 * `ExternalContextCreator` lives in Nest's `InternalCoreModule`, outside this
 * module's context, so it is pulled from `ModuleRef` (`strict: false` searches
 * the whole container) rather than constructor-injected. It is a core singleton
 * already instantiated by the time this provider is built, so resolving it in
 * the constructor is safe.
 *
 * Takes the router instance directly (the route table carries instances, not
 * `InstanceWrapper`s). The inquirer id is omitted: routers are singletons, so
 * there is no request-scoped inquirer to thread through.
 */
@Injectable()
export class HandlerExecutorFactory {
  private readonly paramsFactory = new NestgramParamsFactory();
  private readonly ecc: ExternalContextCreator;

  constructor(private readonly moduleRef: ModuleRef) {
    this.ecc = this.moduleRef.get(ExternalContextCreator, {
      strict: false,
    });
  }

  create(instance: object, methodName: string): HandlerInvoker {
    const callback = (instance as Record<string, unknown>)[methodName];

    const invoker = this.ecc.create(
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
}
