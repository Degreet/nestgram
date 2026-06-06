import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, throwError } from 'rxjs';

import { AutoAnswerCallbackInterceptor } from './auto-answer.interceptor';
import { NestgramModuleOptions } from '../../module/nestgram-module.types';

interface FakeQuery {
  isAnswered: boolean;
  answer: () => Promise<void>;
  answerCalls: number;
}

function fakeQuery(answered = false): FakeQuery {
  const query: FakeQuery = {
    isAnswered: answered,
    answerCalls: 0,
    answer() {
      this.isAnswered = true;
      this.answerCalls += 1;
      return Promise.resolve();
    },
  };
  return query;
}

function contextFor(kind: string, event: unknown): ExecutionContext {
  const tgCtx = { kind, event };
  return {
    getArgByIndex: (i: number) => (i === 1 ? tgCtx : event),
    getHandler: () => () => undefined,
  } as unknown as ExecutionContext;
}

function reflectorReturning(value: unknown): Reflector {
  return { get: () => value } as unknown as Reflector;
}

function build(
  options: Partial<NestgramModuleOptions>,
  optedOut = false,
): AutoAnswerCallbackInterceptor {
  return new AutoAnswerCallbackInterceptor(reflectorReturning(optedOut), {
    token: 'TEST',
    ...options,
  });
}

function run(
  interceptor: AutoAnswerCallbackInterceptor,
  context: ExecutionContext,
): void {
  interceptor.intercept(context, { handle: () => of('result') }).subscribe();
}

describe('AutoAnswerCallbackInterceptor', () => {
  it('answers an unanswered callback query', () => {
    const query = fakeQuery();
    run(build({}), contextFor('callback_query', query));
    expect(query.answerCalls).toBe(1);
  });

  it('does not double-answer a handler that already answered', () => {
    const query = fakeQuery(true);
    run(build({}), contextFor('callback_query', query));
    expect(query.answerCalls).toBe(0);
  });

  it('skips when opted out via @NoAutoAnswer()', () => {
    const query = fakeQuery();
    run(build({}, true), contextFor('callback_query', query));
    expect(query.answerCalls).toBe(0);
  });

  it('skips when disabled globally', () => {
    const query = fakeQuery();
    run(
      build({ autoAnswerCallbackQueries: false }),
      contextFor('callback_query', query),
    );
    expect(query.answerCalls).toBe(0);
  });

  it('ignores non-callback updates', () => {
    const query = fakeQuery();
    run(build({}), contextFor('message', query));
    expect(query.answerCalls).toBe(0);
  });

  it('does not answer when the handler errors (success-only)', () => {
    const query = fakeQuery();
    build({})
      .intercept(contextFor('callback_query', query), {
        handle: () => throwError(() => new Error('boom')),
      })
      .subscribe({ error: () => undefined });
    expect(query.answerCalls).toBe(0);
  });
});
