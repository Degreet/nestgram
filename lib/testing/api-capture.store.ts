import type { ApiRequest } from '../api/request';
import { GetMe } from '../api/methods';
import type { ApiResponder, SentCall, TestUser } from './testing.types';

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

  /** Register (or replace) the stubbed RAW result for one Bot API method. */
  onApi(method: string, responder: ApiResponder): void {
    this.responders.set(method, responder);
  }

  /** Forget all captured calls (the registered responders stay). */
  reset(): void {
    this.sent.length = 0;
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
