import {
  DynamicModule,
  Global,
  Module,
  ModuleMetadata,
  Provider,
  Type,
} from '@nestjs/common';
import { APP_FILTER, NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';

import type { RawUpdate } from '../events/raw-update.types';
import { SendMessage } from '../api/methods';
import type { ApiInterceptor } from '../api/request';
import type { ParseModeValue } from '../api/parse-mode';
import { UpdateDispatcher } from '../engine/dispatcher';
import { NestgramModule } from '../module';
import { ApiCaptureStore } from './api-capture.store';
import { CaptureInterceptor } from './capture.interceptor';
import { CaptureErrorFilter } from './capture-error.filter';
import type {
  ApiResponder,
  CommandClass,
  MethodKey,
  OptionsOf,
  SentCall,
  SentMessagePayload,
} from './testing.types';

/** Options for a single {@link NestgramTestbed.dispatch}. */
export interface DispatchOptions {
  /**
   * Re-throw a handler error after capturing it, so a test can
   * `await expect(bot.dispatch(u, { rethrow: true })).rejects.toThrow(...)`.
   * Off by default — normal `dispatch()` swallows errors for production fidelity
   * (the real dispatcher logs and moves on), exactly as polling would.
   */
  rethrow?: boolean;
}

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
      providers: [
        // A global filter recording handler errors into the capture store, so a
        // throwing handler is observably testable (see CaptureErrorFilter). It
        // runs in the same ECC pipeline the handler does, ahead of the
        // dispatcher's catch.
        { provide: APP_FILTER, useClass: CaptureErrorFilter },
        ...(options.routers ?? []),
        ...(options.providers ?? []),
      ],
    })
    class NestgramTestbedRootModule {}
    return { module: NestgramTestbedRootModule };
  }

  /**
   * Run one fake update through the real dispatcher (the full pipeline).
   *
   * Errors a handler throws are recorded (assert via {@link lastError}) but
   * swallowed by default, mirroring production — the real dispatcher logs and
   * moves on so one bad update can't kill polling. Pass `{ rethrow: true }` to
   * re-throw the captured error so `await expect(...).rejects` works.
   */
  async dispatch(
    update: RawUpdate,
    options: DispatchOptions = {},
  ): Promise<void> {
    this.store.recordError(undefined);
    await this.dispatcher.dispatch(update);
    if (options.rethrow && this.store.lastError !== undefined) {
      throw this.store.lastError;
    }
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
   * The error the last {@link dispatch} raised in the Nest pipeline, or
   * `undefined` if it completed cleanly (or matched nothing). Lets a test assert
   * a handler threw even though the dispatcher swallows it:
   * `expect(bot.lastError).toBeInstanceOf(...)`. A guard denial surfaces here too
   * (Nest guards reject by throwing `ForbiddenException`), so a guard block is
   * distinguishable from a clean no-match (`undefined`).
   */
  get lastError(): unknown {
    return this.store.lastError;
  }

  /**
   * Every captured call for one method, in send order — the generic finder for
   * any Bot API method (edited messages, callback answers, …). Accepts the
   * command class (`bot.calls(SendMessage)`, preferred) or the bare method name
   * (`bot.calls('sendMessage')`, the escape hatch).
   */
  calls<C extends CommandClass>(key: C): SentCall<OptionsOf<C>>[];
  calls(key: string): SentCall[];
  calls(key: MethodKey): SentCall<unknown>[] {
    // The branches look identical but aren't: each narrows `key` to one side of
    // the union so it resolves against the store's matching `calls` overload — an
    // overloaded method's impl signature isn't callable with the raw union.
    return typeof key === 'string'
      ? this.store.calls(key)
      : this.store.calls(key);
  }

  /**
   * The payload of the most recent `sendMessage` as a convenience accessor — the
   * common "what did the bot reply?" assertion (`bot.lastMessage?.text`), typed
   * as the generated `sendMessage` options so `.text`/`.parse_mode`/`.reply_markup`
   * autocomplete. `undefined` if no `sendMessage` was captured.
   */
  get lastMessage(): SentMessagePayload | undefined {
    return this.calls(SendMessage).at(-1)?.payload;
  }

  /**
   * Stub the RAW result of a Bot API method, for a handler that reads a send
   * result (e.g. `const sent = await message.answer('hi'); sent.message_id`). The
   * harness runs the method's `wrap()` over what you return, so return the raw
   * Telegram shape. `getMe` already returns a default identity without a stub.
   *
   * Key it by the command class (`onApi(SendMessage, …)`, preferred) or the bare
   * method name (`onApi('sendMessage', …)`, the escape hatch).
   */
  onApi(key: MethodKey, responder: ApiResponder): this {
    this.store.onApi(key, responder);
    return this;
  }

  /**
   * Forget all captured calls and the last error (registered `onApi` stubs stay)
   * — between cases.
   */
  reset(): void {
    this.store.reset();
  }

  /** Tear down the Nest app (closes the application context). */
  async close(): Promise<void> {
    await this.app.close();
  }
}
