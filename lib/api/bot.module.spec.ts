import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { Observable } from 'rxjs';

import { BotModule } from './bot.module';
import { API_INTERCEPTORS, ApiCallHandler, ApiInterceptor } from './request';
import { DefaultParseModeInterceptor } from '../builtins/parse-mode';
import { RichMessagesInterceptor } from '../builtins/rich-messages';
import { ThrottleInterceptor } from '../builtins/throttle';
import { TokenValidationInterceptor } from '../builtins/token-validation';

@Module({ imports: [BotModule.forRoot({ token: '1:T' })] })
class DefaultApp {}

class CustomThrottler implements ApiInterceptor {
  intercept(_ctx: unknown, next: ApiCallHandler): Observable<unknown> {
    return next.handle();
  }
}

@Module({
  imports: [BotModule.forRoot({ token: '1:T', throttler: CustomThrottler })],
})
class CustomApp {}

function interceptors(app: {
  get: (token: string) => unknown;
}): ApiInterceptor[] {
  return app.get(API_INTERCEPTORS) as ApiInterceptor[];
}

describe('BotModule interceptor wiring', () => {
  it('orders the built-ins token → rich → parse-mode → throttle (innermost)', async () => {
    const app = await NestFactory.createApplicationContext(DefaultApp, {
      logger: false,
    });
    const chain = interceptors(app);

    expect(chain[0]).toBeInstanceOf(TokenValidationInterceptor);
    // Rich rewrite precedes the parse-mode injector: an injected default
    // parse_mode must not read as explicit formatting intent.
    expect(chain[1]).toBeInstanceOf(RichMessagesInterceptor);
    expect(chain[2]).toBeInstanceOf(DefaultParseModeInterceptor);
    expect(chain[chain.length - 1]).toBeInstanceOf(ThrottleInterceptor);
    await app.close();
  });

  it('fills the throttle slot with a custom throttler when provided', async () => {
    const app = await NestFactory.createApplicationContext(CustomApp, {
      logger: false,
    });
    const chain = interceptors(app);

    expect(chain[chain.length - 1]).toBeInstanceOf(CustomThrottler);
    expect(chain.some((i) => i instanceof ThrottleInterceptor)).toBe(false);
    await app.close();
  });
});
