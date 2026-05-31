import { Injectable } from '@nestjs/common';
import { ExternalContextCreator } from '@nestjs/core';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';

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
 */
@Injectable()
export class HandlerExecutorFactory {
  private readonly paramsFactory = new NestgramParamsFactory();

  constructor(
    private readonly externalContextCreator: ExternalContextCreator,
  ) {}

  create(wrapper: InstanceWrapper, methodName: string): HandlerInvoker {
    const { instance } = wrapper;
    const callback = instance[methodName];

    const invoker = this.externalContextCreator.create(
      instance,
      callback,
      methodName,
      ROUTE_ARGS_METADATA,
      this.paramsFactory,
      undefined,
      wrapper.host?.name,
      undefined,
      NESTGRAM_CONTEXT_TYPE,
    );

    return (ctx: TelegramExecutionContext) => invoker(ctx.event, ctx);
  }
}
