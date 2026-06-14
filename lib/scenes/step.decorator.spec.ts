import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';

import { OnText } from '../decorators/listeners/content.decorators';
import { OnCallbackQuery } from '../decorators/listeners/on-callback-query.decorator';
import { ListenerOptions } from '../decorators/listener-options';
import { Metadata } from '../decorators/metadata.enum';
import { NestgramError } from '../exceptions';
import { Step, stepMetadataOf } from './step.decorator';

function listenersOf(method: object): ListenerOptions[] {
  return Reflect.getMetadata(Metadata.LISTENERS, method) ?? [];
}

describe('@Step', () => {
  it('records step metadata with a shared predicate', () => {
    class S {
      @Step()
      @OnText()
      step(): void {
        return undefined;
      }
    }
    const method = S.prototype.step;
    expect(stepMetadataOf(method)).toBeDefined();
    expect(stepMetadataOf(method)?.predicate).toBeDefined();
  });

  it('adds no reprompt listener when `invalid` is unset', () => {
    class S {
      @Step()
      @OnText()
      step(): void {
        return undefined;
      }
    }
    const listeners = listenersOf(S.prototype.step);
    expect(listeners.every((l) => l.reply === undefined)).toBe(true);
  });

  it('adds a deferred reprompt mirroring the step kind (text)', () => {
    class S {
      @Step({ invalid: 'try again' })
      @OnText()
      step(): void {
        return undefined;
      }
    }
    const reprompts = listenersOf(S.prototype.step).filter((l) => l.deferred);
    expect(reprompts).toHaveLength(1);
    expect(reprompts[0]).toMatchObject({
      updateType: 'message',
      reply: 'try again',
    });
  });

  it('mirrors the reprompt to a callback-query step (not hardcoded to message)', () => {
    class S {
      @Step({ invalid: 'pick a valid option' })
      @OnCallbackQuery()
      step(): void {
        return undefined;
      }
    }
    const reprompts = listenersOf(S.prototype.step).filter((l) => l.deferred);
    expect(reprompts).toHaveLength(1);
    expect(reprompts[0].updateType).toBe('callback_query');
  });

  it('throws when `invalid` is set but @Step is below its @On* (no filter to reprompt)', () => {
    expect(() => {
      class S {
        @OnText()
        @Step({ invalid: 'too late' })
        step(): void {
          return undefined;
        }
      }
      // Reference the class so it is not elided.
      void S;
    }).toThrow(NestgramError);
  });

  // Guards the param-0 auto-@Event() path still applies under @Step stacking.
  it('keeps the listener/param wiring intact', () => {
    class S {
      @Step()
      @OnText()
      step(_message: unknown): void {
        return undefined;
      }
    }
    const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, S, 'step');
    expect(args).toBeDefined();
  });
});
