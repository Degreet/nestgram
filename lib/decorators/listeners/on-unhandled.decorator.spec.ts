import 'reflect-metadata';

import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';

import { OnUnhandled } from './on-unhandled.decorator';
import { Metadata } from '../metadata.enum';
import { Sender } from '../params/sender.decorator';

type Args = Record<string, { index: number }> | undefined;

function argsOf(target: object, key: string): Args {
  return Reflect.getMetadata(ROUTE_ARGS_METADATA, target, key) as Args;
}

describe('@OnUnhandled', () => {
  it('marks the method with UNHANDLED metadata', () => {
    class Router {
      handle(_update: unknown): void {
        // test stub
      }
    }
    OnUnhandled()(Router.prototype, 'handle', {
      value: Router.prototype.handle,
    });

    expect(
      Reflect.getMetadata(Metadata.UNHANDLED, Router.prototype.handle),
    ).toBe(true);
  });

  it('auto-decorates the first parameter so it resolves through ECC', () => {
    class Router {
      handle(_update: unknown): void {
        // test stub
      }
    }
    OnUnhandled()(Router.prototype, 'handle', {
      value: Router.prototype.handle,
    });

    const indexes = Object.values(argsOf(Router, 'handle') ?? {}).map(
      (meta) => meta.index,
    );
    expect(indexes).toContain(0);
  });

  it('leaves an author-decorated first parameter alone', () => {
    class Router {
      handle(_sender: unknown): void {
        // test stub
      }
    }
    Sender()(Router.prototype, 'handle', 0);

    OnUnhandled()(Router.prototype, 'handle', {
      value: Router.prototype.handle,
    });

    const atZero = Object.values(argsOf(Router, 'handle') ?? {}).filter(
      (meta) => meta.index === 0,
    );
    expect(atZero).toHaveLength(1);
  });
});
