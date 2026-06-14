import {
  DynamicModule,
  Global,
  Module,
  ModuleMetadata,
  Provider,
  Type,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';

import type { RawUpdate } from '../events/raw-update.types';
import { SendMessage } from '../api/methods';
import type { ApiInterceptor } from '../api/request';
import type { ParseModeValue } from '../api/parse-mode';
import { UpdateDispatcher } from '../engine/dispatcher';
import { NestgramModule } from '../module';
import { ApiCaptureStore } from './api-capture.store';
import { CaptureInterceptor } from './capture.interceptor';
import type { ApiResponder, SentCall } from './testing.types';

/**
 * What {@link NestgramTestbed.create} accepts. Provide EITHER `routers` (+ any
 * `providers`) for a focused router test, OR `imports` (e.g. your real
 * `AppModule`) for a wider one — or both. The bot starts with NO transport
 * (polling/webhook off), so nothing ever reaches the network; the harness drives
 * the real {@link UpdateDispatcher} directly.
 */
export interface TestbedOptions extends Pick<ModuleMetadata, 'imports'> {
  /** Router classes (and other providers) to register for this test. */
  routers?: Type[];
  /** Extra providers the routers depend on (services, mocks, …). */
  providers?: Provider[];
  /** The bot token (any non-empty string — it is never sent anywhere). */
  token?: string;
  /** Default `parse_mode` for sends, mirroring `NestgramModule.forRoot`. */
  parseMode?: ParseModeValue;
  /** Auto-answer unanswered callback queries (on by default, as in production). */
  autoAnswerCallbackQueries?: boolean;
  /**
   * Extra outbound API interceptors to test alongside the capture seam. They run
   * before the capture, so their request mutations show up in `sent`.
   */
  apiInterceptors?: Type<ApiInterceptor>[];
}

/** The token the testbed uses when none is given — never sent anywhere. */
const TEST_TOKEN = 'TEST:token';

/** The Bot API method behind {@link NestgramTestbed.lastMessage} — read off the
 * command class, not a bare string literal. */
const SEND_MESSAGE_METHOD = new SendMessage({ chat_id: 0, text: '' }).method;

/**
 * Makes the per-testbed {@link ApiCaptureStore} resolvable app-wide, so the
 * `CaptureInterceptor` Nest instantiates inside each (global) per-bot module
 * injects THIS testbed's store. Built per `create()` with the right instance.
 */
@Global()
@Module({})
class CaptureStoreModule {
  static withStore(store: ApiCaptureStore): DynamicModule {
    return {
      module: CaptureStoreModule,
      providers: [{ provide: ApiCaptureStore, useValue: store }],
      exports: [ApiCaptureStore],
    };
  }
}

/**
 * Tests a bot's REAL routers and pipeline without a Telegram connection.
 *
 * It boots a Nest application context with the genuine engine — discovery builds
 * the route table, {@link UpdateDispatcher} runs each update through the full Nest
 * pipeline (stages, matching, guards/interceptors/pipes/filters via ECC) — and
 * swaps only the HTTP boundary for capture, via a {@link CaptureInterceptor} on
 * the bot's API pipeline. Every outgoing call is recorded on {@link sent} instead
 * of sent; stub the responses a handler reads back with {@link onApi}.
 *
 * ```ts
 * const bot = await NestgramTestbed.create({ routers: [StartRouter] });
 * await bot.dispatch(updates.command('start'));
 * expect(bot.lastMessage?.text).toBe('Hi');
 * await bot.close();
 * ```
 */
export class NestgramTestbed {
  private constructor(
    private readonly app: INestApplicationContext,
    private readonly dispatcher: UpdateDispatcher,
    private readonly store: ApiCaptureStore,
  ) {}

  static async create(options: TestbedOptions = {}): Promise<NestgramTestbed> {
    const store = new ApiCaptureStore();
    const rootModule = this.buildRootModule(options, store);
    // createApplicationContext runs the full lifecycle, incl.
    // OnApplicationBootstrap — where NestgramBootstrap builds the route table and
    // pipeline stages. No transport is configured, so nothing touches the network.
    const app = await NestFactory.createApplicationContext(rootModule, {
      logger: false,
    });
    const dispatcher = app.get(UpdateDispatcher);
    return new NestgramTestbed(app, dispatcher, store);
  }

  /**
   * The root module: the user's routers/imports plus `NestgramModule.forRoot`
   * with NO transport and the capture interceptor appended LAST (so it sees the
   * fully-mutated request and short-circuits the wire), plus the global module
   * carrying this testbed's capture store.
   */
  private static buildRootModule(
    options: TestbedOptions,
    store: ApiCaptureStore,
  ): DynamicModule {
    const userInterceptors = options.apiInterceptors ?? [];
    @Module({
      imports: [
        CaptureStoreModule.withStore(store),
        NestgramModule.forRoot({
          token: options.token ?? TEST_TOKEN,
          autoAnswerCallbackQueries: options.autoAnswerCallbackQueries,
          parseMode: options.parseMode,
          // Capture is the last interceptor: after the built-in mutators, just
          // above the throttler/wire — so it records the final request and never
          // lets the call go out.
          apiInterceptors: [...userInterceptors, CaptureInterceptor],
        }),
        ...(options.imports ?? []),
      ],
      providers: [...(options.routers ?? []), ...(options.providers ?? [])],
    })
    class NestgramTestbedRootModule {}
    return { module: NestgramTestbedRootModule };
  }

  /** Run one fake update through the real dispatcher (the full pipeline). */
  async dispatch(update: RawUpdate): Promise<void> {
    await this.dispatcher.dispatch(update);
  }

  /** Every captured outgoing API call, in send order. */
  get sent(): readonly SentCall[] {
    return this.store.sent;
  }

  /** The most recent captured call, or `undefined` if nothing was sent. */
  get lastCall(): SentCall | undefined {
    return this.store.sent[this.store.sent.length - 1];
  }

  /**
   * The payload of the most recent `sendMessage` as a convenience accessor — the
   * common "what did the bot reply?" assertion (`bot.lastMessage?.text`).
   * `undefined` if no `sendMessage` was captured.
   */
  get lastMessage(): Record<string, unknown> | undefined {
    for (let i = this.store.sent.length - 1; i >= 0; i -= 1) {
      const call = this.store.sent[i];
      if (call.method === SEND_MESSAGE_METHOD) {
        return call.payload;
      }
    }
    return undefined;
  }

  /**
   * Stub the RAW result of a Bot API method, for a handler that reads a send
   * result (e.g. `const sent = await message.answer('hi'); sent.message_id`). The
   * harness runs the method's `wrap()` over what you return, so return the raw
   * Telegram shape. `getMe` already returns a default identity without a stub.
   */
  onApi(method: string, responder: ApiResponder): this {
    this.store.onApi(method, responder);
    return this;
  }

  /** Forget all captured calls (registered `onApi` stubs stay) — between cases. */
  reset(): void {
    this.store.reset();
  }

  /** Tear down the Nest app (closes the application context). */
  async close(): Promise<void> {
    await this.app.close();
  }
}
