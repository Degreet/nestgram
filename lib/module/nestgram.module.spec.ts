import { Inject, Injectable, Logger, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { BotService } from '../api';
import { InjectBot } from '../decorators/inject-bot.decorator';
import { Bot } from '../decorators/params/bot.decorator';
import { Command } from '../decorators/listeners/command.decorator';
import { OnMessage } from '../decorators/listeners/on-message.decorator';
import { OnCallbackQuery } from '../decorators/listeners/on-callback-query.decorator';
import { Router } from '../decorators/injectable/router.decorator';
import { Sender } from '../decorators/params/sender.decorator';
import { Args } from '../decorators/params/args.decorator';
import { RouteTable } from '../engine/discovery';
import { UpdateDispatcher } from '../engine/dispatcher';
import { RawUpdate } from '../events/raw-update.types';
import { User } from '../events/user';
import { Message } from '../events';
import {
  ApiCallHandler,
  ApiExecutionContext,
  ApiInterceptor,
} from '../api/request';
import type { Observable } from 'rxjs';
import { Providers } from '../providers';
import {
  PollingUpdateSource,
  UpdateListener,
  UpdateSource,
  WebhookSourceEntry,
  WebhookUpdateSource,
} from '../engine/source';
import { QueuedUpdateSource } from '../engine/queue';
import { NestgramModule } from './nestgram.module';

const originalFetch = global.fetch;

/**
 * A real router: discovered via the provider graph (no `routers` list), invoked
 * through the full ECC pipeline. The first parameter is an undecorated typed
 * event — the framework auto-applies `@Event()` to it. Records what it saw
 * instead of replying, so no network is hit.
 */
@Router()
class GreetRouter {
  seen: RawUpdate['message'][] = [];

  @OnMessage()
  onMessage(message: RawUpdate['message']): void {
    this.seen.push(message);
  }
}

// The documented bootstrap shape: a plain Nest module importing NestgramModule.
// `polling` is omitted so no transport starts — no network during the test.
@Module({
  imports: [NestgramModule.forRoot({ token: 'TEST' })],
  providers: [GreetRouter],
})
class AppModule {}

function messageUpdate(update_id: number, text: string): RawUpdate {
  return {
    update_id,
    message: {
      message_id: update_id,
      date: 1,
      chat: { id: 1, type: 'private' },
      from: { id: 7, is_bot: false, first_name: 'Alice' },
      text,
    },
  };
}

describe('NestgramModule (integration)', () => {
  it('boots: builds the route table by discovery and dispatches through ECC', async () => {
    // createApplicationContext runs OnApplicationBootstrap, building the table.
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
    });

    const table = app.get(RouteTable);
    // 1 user route + 5 built-ins: no-op, checkbox toggle + clear, pagination nav (pagego + pageat).
    expect(table.size).toBe(6);
    expect(table.ofType('message')).toHaveLength(1);

    const dispatcher = app.get(UpdateDispatcher);
    const router = app.get(GreetRouter);

    await dispatcher.dispatch(messageUpdate(1, '/start'));

    expect(router.seen).toHaveLength(1);
    expect(router.seen[0]?.text).toBe('/start');

    await app.close();
  });

  it('does not require a routers array in forRoot (discovery handles it)', async () => {
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
    });

    // The only place GreetRouter is named is the providers array; forRoot got
    // no routers list, yet the route table still found it (1 user + 5 built-in).
    expect(app.get(RouteTable).size).toBe(6);

    await app.close();
  });
});

// A ConfigService stand-in: the realistic forRootAsync case where the token
// comes from injected config rather than a literal.
@Injectable()
class FakeConfig {
  readonly token = 'ASYNC_TOKEN';
}

@Module({ providers: [FakeConfig], exports: [FakeConfig] })
class FakeConfigModule {}

@Module({
  imports: [
    NestgramModule.forRootAsync({
      imports: [FakeConfigModule],
      inject: [FakeConfig],
      useFactory: (config: FakeConfig) => ({ token: config.token }),
    }),
  ],
  providers: [GreetRouter],
})
class AsyncAppModule {}

describe('NestgramModule.forRootAsync (integration)', () => {
  it('resolves options from DI and threads the token down to BotService', async () => {
    const app = await NestFactory.createApplicationContext(AsyncAppModule, {
      logger: false,
    });

    // Token resolved via the injected config factory reached the transport.
    expect(app.get(BotService).token).toBe('ASYNC_TOKEN');
    // Engine still wired: discovery built the route table (1 user + 5 built-in).
    expect(app.get(RouteTable).size).toBe(6);

    await app.close();
  });
});

// Content matching end to end: @Command must win over a generic @OnMessage for
// a matching command, and fall through to it otherwise (first-match routing).
@Router()
class CommandRouter {
  hits: string[] = [];

  @Command('start')
  start(): void {
    this.hits.push('start');
  }

  @OnMessage()
  echo(): void {
    this.hits.push('echo');
  }
}

@Module({
  imports: [NestgramModule.forRoot({ token: 'TEST' })],
  providers: [CommandRouter],
})
class CommandAppModule {}

describe('match predicates (integration)', () => {
  it('routes /start to @Command and other text to @OnMessage', async () => {
    const app = await NestFactory.createApplicationContext(CommandAppModule, {
      logger: false,
    });
    const dispatcher = app.get(UpdateDispatcher);
    const router = app.get(CommandRouter);

    await dispatcher.dispatch(messageUpdate(1, '/start'));
    await dispatcher.dispatch(messageUpdate(2, 'just chatting'));

    expect(router.hits).toEqual(['start', 'echo']);

    await app.close();
  });
});

// Stacking listener decorators on one method binds it to several update types —
// no @On([...]) union needed (listener metadata is an array).
@Router()
class MultiRouter {
  hits: string[] = [];

  @OnMessage()
  @OnCallbackQuery()
  handle(): void {
    this.hits.push('hit');
  }
}

@Module({
  imports: [NestgramModule.forRoot({ token: 'TEST' })],
  providers: [MultiRouter],
})
class MultiAppModule {}

describe('stacked listener decorators (integration)', () => {
  it('binds one method to several update types', async () => {
    const app = await NestFactory.createApplicationContext(MultiAppModule, {
      logger: false,
    });
    const table = app.get(RouteTable);
    const dispatcher = app.get(UpdateDispatcher);
    const router = app.get(MultiRouter);

    // The one method binds to message + callback_query; the callback_query side
    // also carries the 5 built-in callback routes (no-op, checkbox toggle + clear, pagego + pageat).
    expect(table.ofType('message')).toHaveLength(1);
    expect(table.ofType('callback_query')).toHaveLength(6);

    await dispatcher.dispatch(messageUpdate(1, 'hi'));
    expect(router.hits).toEqual(['hit']);

    await app.close();
  });
});

// Parameter decorators resolve through ECC: the undecorated event (auto-@Event)
// and @Sender/@Args coexist on one handler.
@Router()
class ParamsRouter {
  seen?: { text?: string; userId?: number; args: string[] };

  @Command('echo :rest...')
  echo(
    message: RawUpdate['message'],
    @Sender() user: User,
    @Args() args: string[],
  ): void {
    this.seen = { text: message?.text, userId: user?.id, args };
  }
}

@Module({
  imports: [NestgramModule.forRoot({ token: 'TEST' })],
  providers: [ParamsRouter],
})
class ParamsAppModule {}

// The landing/README showcase shape: the ONLY parameter is a decorated one at
// index 0 — auto-@Event must leave it alone (it only fills an undecorated
// param 0), so the handler receives the sender, not the event.
@Router()
class SenderFirstRouter {
  seenUser?: User;

  @Command('start')
  start(@Sender() user: User): void {
    this.seenUser = user;
  }
}

@Module({
  imports: [NestgramModule.forRoot({ token: 'TEST' })],
  providers: [SenderFirstRouter],
})
class SenderFirstAppModule {}

describe('parameter decorators (integration)', () => {
  it('resolves the auto-@Event first param alongside @Sender and @Args', async () => {
    const app = await NestFactory.createApplicationContext(ParamsAppModule, {
      logger: false,
    });
    const dispatcher = app.get(UpdateDispatcher);
    const router = app.get(ParamsRouter);

    await dispatcher.dispatch(messageUpdate(1, '/echo a b'));

    expect(router.seen).toEqual({
      text: '/echo a b',
      userId: 7,
      args: ['a', 'b'],
    });

    await app.close();
  });

  it('respects a decorated param 0: @Sender() first arg gets the sender, not the event', async () => {
    const app = await NestFactory.createApplicationContext(
      SenderFirstAppModule,
      { logger: false },
    );
    const dispatcher = app.get(UpdateDispatcher);
    const router = app.get(SenderFirstRouter);

    await dispatcher.dispatch(messageUpdate(1, '/start'));

    expect(router.seenUser).toEqual(
      expect.objectContaining({ id: 7, first_name: 'Alice' }),
    );

    await app.close();
  });
});

@Module({ imports: [NestgramModule.forRoot({ token: '' })] })
class EmptyTokenAppModule {}

@Module({ imports: [NestgramModule.forRoot({ token: 'not-a-token' })] })
class MalformedTokenAppModule {}

// Token validation lives in TokenValidationTransformer (constructed at boot via
// the request pipeline, so it can't be bypassed by going through BotService
// directly). These boot tests prove the token checks fire at startup.
describe('production baseline', () => {
  it('throws at boot when the token is missing', async () => {
    // TokenValidationTransformer throws from its constructor (DI init);
    // abortOnError:false makes Nest reject instead of process.exit, so the
    // error is catchable here.
    await expect(
      NestFactory.createApplicationContext(EmptyTokenAppModule, {
        logger: false,
        abortOnError: false,
      }),
    ).rejects.toThrow(/token is required/);
  });

  it('warns when the token is malformed', async () => {
    const warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);

    const app = await NestFactory.createApplicationContext(
      MalformedTokenAppModule,
      { logger: false },
    );

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Telegram token'),
    );

    await app.close();
    warn.mockRestore();
  });
});

describe('request pipeline (real-module DI)', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  // Regression: API_INTERCEPTORS must inject as an ARRAY. Nest has no generic
  // `multi: true` aggregation (a multi token collapses to a single instance), so
  // every bot.call crashed with "interceptors is not iterable" in a real
  // (DI-wired) module — a path the hand-built-pipeline unit tests never exercised.
  it('runs a bot.call through the DI interceptor pipeline without crashing', async () => {
    global.fetch = (async () => ({
      json: async () => ({
        ok: true,
        result: { message_id: 1, chat: { id: 1, type: 'private' } },
      }),
    })) as unknown as typeof fetch;

    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
    });

    await expect(
      app.get(BotService).sendMessage(1, 'hi'),
    ).resolves.toBeInstanceOf(Message);

    await app.close();
  });

  it('runs a user-supplied interceptor alongside the built-ins', async () => {
    let body: Record<string, unknown> = {};
    global.fetch = (async (_url: string, init: { body?: string }) => {
      body = init.body ? JSON.parse(init.body) : {};
      return { json: async () => ({ ok: true, result: {} }) } as Response;
    }) as typeof fetch;

    const app = await NestFactory.createApplicationContext(
      UserInterceptorAppModule,
      { logger: false },
    );
    await app.get(BotService).sendMessage(1, 'hi');

    expect(body.tagged).toBe(true);
    await app.close();
  });
});

@Injectable()
class TagInterceptor implements ApiInterceptor {
  intercept(
    context: ApiExecutionContext,
    next: ApiCallHandler,
  ): Observable<unknown> {
    context.getRequest().payload.tagged = true;
    return next.handle();
  }
}

@Module({
  imports: [
    NestgramModule.forRoot({
      token: '123456:TEST',
      apiInterceptors: [TagInterceptor],
    }),
  ],
})
class UserInterceptorAppModule {}

@Module({
  imports: [
    NestgramModule.forRoot({
      token: '123456:TEST',
      webhook: {
        url: 'https://bot.example.com/telegram/webhook',
        secretToken: 's3cret',
      },
    }),
  ],
})
class WebhookAppModule {}

// Proves the enabling mechanism of the "register the controller yourself"
// contract: WebhookUpdateSource is exported from the (global) module and
// injectable from another module. This is an @Injectable provider standing in
// for a controller — controllers need an HTTP driver (@nestjs/platform-*), which
// isn't in the test deps, so the controller-over-HTTP round-trip isn't exercised
// here (the route metadata itself is covered in webhook.controller.spec).
@Injectable()
class WebhookConsumer {
  constructor(readonly source: WebhookUpdateSource) {}
}

@Module({
  imports: [
    NestgramModule.forRoot({
      token: '123456:TEST',
      webhook: {
        url: 'https://bot.example.com/telegram/webhook',
        secretToken: 's3cret',
      },
    }),
  ],
  providers: [WebhookConsumer],
})
class WebhookConsumerModule {}

describe('webhook transport (real-module DI)', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('selects the webhook source as UPDATE_SOURCE and validates the secret', async () => {
    // getMe (identity warm) + setWebhook (start) + deleteWebhook (shutdown) all
    // hit fetch at boot/close; stub it so no network is touched.
    global.fetch = (async () => ({
      json: async () => ({ ok: true, result: {} }),
    })) as unknown as typeof fetch;

    const app = await NestFactory.createApplicationContext(WebhookAppModule, {
      logger: false,
    });
    // The active source is the default update queue wrapping the webhook source;
    // the webhook source itself stays injectable by its class token (what the
    // controller uses) and still validates the secret.
    expect(app.get<UpdateSource>(Providers.UPDATE_SOURCE)).toBeInstanceOf(
      QueuedUpdateSource,
    );
    const webhook = app.get(WebhookUpdateSource);
    expect(webhook.verifySecret('s3cret')).toBe(true);
    expect(webhook.verifySecret('wrong')).toBe(false);

    await app.close();
  });

  it('exports WebhookUpdateSource so a user-registered receiver can inject it', async () => {
    global.fetch = (async () => ({
      json: async () => ({ ok: true, result: {} }),
    })) as unknown as typeof fetch;

    // Boots only if WebhookUpdateSource resolves in the consumer module — i.e.
    // it is exported from the global NestgramModule.
    const app = await NestFactory.createApplicationContext(
      WebhookConsumerModule,
      { logger: false },
    );

    expect(app.get(WebhookConsumer).source).toBeInstanceOf(WebhookUpdateSource);

    await app.close();
  });
});

// Multi-bot: forRoot({ bots: [...] }) provides one isolated BotService per bot.
@Injectable()
class CrossBotConsumer {
  constructor(
    // No decorator → the default bot (support, flagged default below).
    readonly current: BotService,
    @InjectBot('support') readonly support: BotService,
    @InjectBot('sales') readonly sales: BotService,
  ) {}
}

@Module({
  imports: [
    NestgramModule.forRoot({
      bots: [
        { name: 'support', token: '111:SUPPORT', default: true },
        { name: 'sales', token: '222:SALES', parseMode: 'MarkdownV2' },
      ],
    }),
  ],
  providers: [CrossBotConsumer],
})
class MultiBotAppModule {}

describe('multi-bot (forRoot bots: [])', () => {
  it('provides one BotService per bot, injectable by name, default as the bare token', async () => {
    const app = await NestFactory.createApplicationContext(MultiBotAppModule, {
      logger: false,
    });
    const consumer = app.get(CrossBotConsumer);

    // Each bot is its own instance carrying its own token.
    expect(consumer.support.token).toBe('111:SUPPORT');
    expect(consumer.sales.token).toBe('222:SALES');
    expect(consumer.sales).not.toBe(consumer.support);
    // A bare BotService injection resolves the default bot (support).
    expect(consumer.current).toBe(consumer.support);

    await app.close();
  });
});

// Co-equal bots: no default flagged. Each is reached only by name; a bare
// BotService is ambiguous and not provided.
@Injectable()
class NamedOnlyConsumer {
  constructor(
    @InjectBot('a') readonly a: BotService,
    @InjectBot('b') readonly b: BotService,
  ) {}
}

@Module({
  imports: [
    NestgramModule.forRoot({
      bots: [
        { name: 'a', token: '111:A' },
        { name: 'b', token: '222:B' },
      ],
    }),
  ],
  providers: [NamedOnlyConsumer],
})
class CoEqualAppModule {}

@Injectable()
class BareConsumer {
  constructor(readonly bot: BotService) {}
}

@Module({
  imports: [
    NestgramModule.forRoot({
      bots: [
        { name: 'a', token: '111:A' },
        { name: 'b', token: '222:B' },
      ],
    }),
  ],
  providers: [BareConsumer],
})
class CoEqualBareAppModule {}

describe('multi-bot with no default (co-equal)', () => {
  it('boots and resolves each bot by name', async () => {
    const app = await NestFactory.createApplicationContext(CoEqualAppModule, {
      logger: false,
    });
    const consumer = app.get(NamedOnlyConsumer);

    expect(consumer.a.token).toBe('111:A');
    expect(consumer.b.token).toBe('222:B');
    expect(consumer.a).not.toBe(consumer.b);

    await app.close();
  });

  it('makes a bare BotService injection fail (ambiguous — must name the bot)', async () => {
    await expect(
      NestFactory.createApplicationContext(CoEqualBareAppModule, {
        logger: false,
        abortOnError: false,
      }),
    ).rejects.toThrow();
  });
});

// Phase 2: a multi-bot polling config starts one poller per bot, each
// dispatching with its own BotService.
@Module({
  imports: [
    NestgramModule.forRoot({
      bots: [
        { name: 'a', token: '111:AAA', polling: { idleMs: 5 }, default: true },
        { name: 'b', token: '222:BBB', polling: { idleMs: 5 } },
      ],
    }),
  ],
  providers: [GreetRouter],
})
class PollingFleetAppModule {}

function jsonResponse(body: unknown): Response {
  return { json: async () => body } as Response;
}

async function waitForCalls(
  pred: () => boolean,
  timeoutMs = 1500,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!pred()) {
    if (Date.now() > deadline) throw new Error('waitForCalls timed out');
    await new Promise((r) => setTimeout(r, 5));
  }
}

// @Bot() injects the bot that received the current update.
@Router()
class BotAwareRouter {
  seenName?: string;

  @OnMessage()
  handle(_message: RawUpdate['message'], @Bot() bot: BotService): void {
    this.seenName = bot.name;
  }
}

@Module({
  imports: [NestgramModule.forRoot({ token: 'TEST' })],
  providers: [BotAwareRouter],
})
class BotAwareAppModule {}

describe('@Bot param', () => {
  it('injects the current update’s bot (the default, here)', async () => {
    const app = await NestFactory.createApplicationContext(BotAwareAppModule, {
      logger: false,
    });
    const dispatcher = app.get(UpdateDispatcher);
    const router = app.get(BotAwareRouter);

    await dispatcher.dispatch(messageUpdate(1, 'hi'));

    expect(router.seenName).toBe('default');

    await app.close();
  });
});

// Multi-bot webhook: each webhook bot gets a per-bot WebhookUpdateSource under
// getWebhookSourceToken(name), aggregated into WEBHOOK_SOURCES for the ready-made
// controllers. Booting starts the fleet, registering each bot's webhook.
@Injectable()
class WebhookSourcesConsumer {
  constructor(
    @Inject(Providers.WEBHOOK_SOURCES) readonly entries: WebhookSourceEntry[],
  ) {}
}

@Module({
  imports: [
    NestgramModule.forRoot({
      bots: [
        {
          name: 'support',
          token: '111:SUPPORT',
          default: true,
          webhook: {
            url: 'https://x/telegram/webhook/support',
            secretToken: 's',
          },
        },
        {
          name: 'sales',
          token: '222:SALES',
          webhook: {
            url: 'https://x/telegram/webhook/sales',
            secretToken: 'x',
          },
        },
      ],
    }),
  ],
  providers: [WebhookSourcesConsumer],
})
class MultiBotWebhookAppModule {}

describe('multi-bot webhook (forRoot bots: [])', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('provides WEBHOOK_SOURCES — one per webhook bot, each its own source, default flagged', async () => {
    // getMe + setWebhook (start) + deleteWebhook (close) hit fetch at boot; stub it.
    global.fetch = (async () => ({
      json: async () => ({ ok: true, result: { username: 'bot' } }),
    })) as unknown as typeof fetch;

    const app = await NestFactory.createApplicationContext(
      MultiBotWebhookAppModule,
      { logger: false },
    );
    const { entries } = app.get(WebhookSourcesConsumer);

    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.source.name).sort()).toEqual([
      'sales',
      'support',
    ]);
    const support = entries.find((e) => e.source.name === 'support');
    expect(support?.isDefault).toBe(true);
    expect(support?.source).toBeInstanceOf(WebhookUpdateSource);
    // Routing primitives the controllers rely on are wired per bot.
    expect(support?.source.ownsSecret('s')).toBe(true);
    expect(support?.source.ownsSecret('x')).toBe(false);

    await app.close();
  });
});

// Custom update source seam: a user-supplied `source` factory can replace
// ingestion (no polling/webhook) or wrap the built-in transport.
class RecordingSource implements UpdateSource {
  started = false;
  listener?: UpdateListener;
  async start(onUpdate: UpdateListener): Promise<void> {
    this.started = true;
    this.listener = onUpdate;
  }
  async stop(): Promise<void> {
    this.started = false;
  }
}

class WrappingSource implements UpdateSource {
  constructor(readonly inner: UpdateSource) {}
  start(onUpdate: UpdateListener): Promise<void> {
    return this.inner.start(onUpdate);
  }
  stop(): Promise<void> {
    return this.inner.stop();
  }
}

const replacingSource = new RecordingSource();
let replacingFactoryCalls = 0;

@Module({
  imports: [
    NestgramModule.forRoot({
      token: '123456:TEST',
      // No polling/webhook: the custom source IS the transport.
      source: () => {
        replacingFactoryCalls += 1;
        return replacingSource;
      },
    }),
  ],
  providers: [GreetRouter],
})
class CustomSourceAppModule {}

let wrappingSource: WrappingSource | undefined;

@Module({
  imports: [
    NestgramModule.forRoot({
      token: '123456:TEST',
      polling: { idleMs: 5 },
      source: ({ default: inner }) => {
        if (!inner) {
          throw new Error('expected the polling transport as default');
        }
        wrappingSource = new WrappingSource(inner);
        return wrappingSource;
      },
    }),
  ],
  providers: [GreetRouter],
})
class WrappedSourceAppModule {}

describe('custom update source (source seam)', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('replaces ingestion: the custom source is started and its updates dispatch', async () => {
    // startFleet warms identity (getMe) before starting the source.
    global.fetch = (async () => ({
      json: async () => ({ ok: true, result: { username: 'bot' } }),
    })) as unknown as typeof fetch;

    const app = await NestFactory.createApplicationContext(
      CustomSourceAppModule,
      { logger: false },
    );
    const router = app.get(GreetRouter);

    expect(replacingSource.started).toBe(true);
    // The factory runs exactly once — not also by the (unstarted) UPDATE_SOURCE
    // provider — so a non-idempotent factory can't build a stray instance.
    expect(replacingFactoryCalls).toBe(1);
    // Drive an update through the listener the framework handed our source. The
    // default queue wraps it, so dispatch runs in the background after admission.
    await replacingSource.listener?.(messageUpdate(1, 'from-custom-source'));
    await new Promise((r) => setImmediate(r));
    expect(router.seen.map((m) => m?.text)).toEqual(['from-custom-source']);

    await app.close();
  });

  it('wraps the built-in transport, then the default queue wraps that', async () => {
    global.fetch = (async () => ({
      json: async () => ({ ok: true, result: [] }),
    })) as unknown as typeof fetch;

    const app = await NestFactory.createApplicationContext(
      WrappedSourceAppModule,
      { logger: false },
    );
    // Composition order: default queue on top of the user's source on top of
    // the polling transport (orthogonal — `source` = ingestion, queue = layer).
    expect(app.get<UpdateSource>(Providers.UPDATE_SOURCE)).toBeInstanceOf(
      QueuedUpdateSource,
    );
    expect(wrappingSource?.inner).toBeInstanceOf(PollingUpdateSource);

    await app.close();
  });
});

@Module({
  imports: [
    NestgramModule.forRoot({ token: '123456:TEST', polling: { idleMs: 5 } }),
  ],
})
class DefaultQueueAppModule {}

@Module({
  imports: [
    NestgramModule.forRoot({
      token: '123456:TEST',
      polling: { idleMs: 5 },
      updateQueue: false,
    }),
  ],
})
class NoQueueAppModule {}

describe('default update queue', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('wraps the transport in the update queue by default', async () => {
    global.fetch = (async () => ({
      json: async () => ({ ok: true, result: [] }),
    })) as unknown as typeof fetch;

    const app = await NestFactory.createApplicationContext(
      DefaultQueueAppModule,
      { logger: false },
    );

    expect(app.get<UpdateSource>(Providers.UPDATE_SOURCE)).toBeInstanceOf(
      QueuedUpdateSource,
    );

    await app.close();
  });

  it('updateQueue: false dispatches through the bare transport (no queue)', async () => {
    global.fetch = (async () => ({
      json: async () => ({ ok: true, result: [] }),
    })) as unknown as typeof fetch;

    const app = await NestFactory.createApplicationContext(NoQueueAppModule, {
      logger: false,
    });

    expect(app.get<UpdateSource>(Providers.UPDATE_SOURCE)).toBeInstanceOf(
      PollingUpdateSource,
    );

    await app.close();
  });
});

describe('multi-bot polling fleet', () => {
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('runs a poller per bot and dispatches with the originating bot', async () => {
    // getUpdates: one update for bot A (matched by its token in the URL), then
    // empty; everything else (getMe, deleteWebhook, bot B) returns empty/ok.
    let servedA = false;
    global.fetch = (async (url: string) => {
      const target = String(url);
      if (target.includes('/getUpdates')) {
        if (target.includes('111:AAA') && !servedA) {
          servedA = true;
          return jsonResponse({ ok: true, result: [messageUpdate(1, 'hi')] });
        }
        return jsonResponse({ ok: true, result: [] });
      }
      return jsonResponse({ ok: true, result: { username: 'bot' } });
    }) as unknown as typeof fetch;

    // Spy before boot: the poller's onUpdate closure calls this.dispatcher.dispatch.
    const dispatch = jest.spyOn(UpdateDispatcher.prototype, 'dispatch');

    const app = await NestFactory.createApplicationContext(
      PollingFleetAppModule,
      { logger: false },
    );
    try {
      await waitForCalls(() => dispatch.mock.calls.length >= 1);
      const [, bot] = dispatch.mock.calls[0];
      // The dispatched update was threaded with bot A's BotService.
      expect((bot as BotService | undefined)?.token).toBe('111:AAA');
    } finally {
      await app.close();
    }
  });
});
