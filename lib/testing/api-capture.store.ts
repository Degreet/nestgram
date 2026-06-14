import type { ApiRequest } from '../api/request';
import { GetMe } from '../api/methods';
import type {
  ApiResponder,
  CommandClass,
  MethodKey,
  OptionsOf,
  SentCall,
  TestUser,
} from './testing.types';

/** The synthetic bot identity `getMe` returns by default (no network). */
const DEFAULT_BOT_IDENTITY: TestUser = {
  id: 42,
  is_bot: true,
  first_name: 'Test Bot',
  username: 'test_bot',
};

/**
 * Records every outgoing Bot API call and resolves a stubbed response for it —
 * the in-memory state behind {@link CaptureBotService}. Shared by reference
 * between the capturing `BotService` (which writes to it on each call) and the
 * {@link NestgramTestbed} the author asserts on (which reads it).
 *
 * Jest-agnostic on purpose: it holds plain data and returns plain values, so
 * `lib/testing` never imports a test framework and nothing test-only leaks into
 * the runtime bundle.
 */
export class ApiCaptureStore {
  /** Every captured call, in send order. */
  readonly sent: SentCall[] = [];
  /** Per-method response stubs registered via {@link onApi}. */
  private readonly responders = new Map<string, ApiResponder>();
  /** The most recent handler error a {@link CaptureErrorFilter} recorded. */
  private capturedError: unknown;

  /**
   * Reads the Bot API method name off a {@link MethodKey}: the bare string as-is,
   * or a throwaway instance of a command class (`new SendMessage().method`) so the
   * caller can name the method by its typed command, not a string literal.
   *
   * The instance is built with no payload on purpose — only `.method` (a
   * class-level readonly string, set independently of the payload) is read, never
   * the payload itself.
   */
  static methodNameOf(key: MethodKey): string {
    if (typeof key === 'string') {
      return key;
    }
    return new key().method;
  }

  /** Register (or replace) the stubbed RAW result for one Bot API method. */
  onApi(key: MethodKey, responder: ApiResponder): void {
    this.responders.set(ApiCaptureStore.methodNameOf(key), responder);
  }

  /** Every captured call for one method, in send order. */
  calls<C extends CommandClass>(key: C): SentCall<OptionsOf<C>>[];
  calls(key: string): SentCall[];
  calls(key: MethodKey): SentCall<unknown>[] {
    const method = ApiCaptureStore.methodNameOf(key);
    return this.sent.filter((call) => call.method === method);
  }

  /** Record a handler error (called by {@link CaptureErrorFilter}). */
  recordError(error: unknown): void {
    this.capturedError = error;
  }

  /** The most recent handler error, or `undefined` if none was thrown. */
  get lastError(): unknown {
    return this.capturedError;
  }

  /** Forget all captured calls and the last error (registered responders stay). */
  reset(): void {
    this.sent.length = 0;
    this.capturedError = undefined;
  }

  /**
   * Record one call and resolve its RAW result. Called by {@link CaptureBotService}
   * with the FINAL request (post-interceptors). A registered responder wins; else
   * `getMe` returns the default identity and every other method returns an empty
   * object — enough for the common `wrap()` to build a (sparse) rich result.
   */
  async capture(request: ApiRequest): Promise<unknown> {
    // A shallow copy is enough: capture is the terminal step (it short-circuits
    // the wire), so nothing mutates the payload after this point — nested objects
    // shared by reference can't be retro-mutated.
    this.sent.push({ method: request.method, payload: { ...request.payload } });

    const responder = this.responders.get(request.method);
    if (responder) {
      return responder(request);
    }
    if (request.method === new GetMe().method) {
      return DEFAULT_BOT_IDENTITY;
    }
    return {};
  }
}
