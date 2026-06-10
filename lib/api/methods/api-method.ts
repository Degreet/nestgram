import type { BotService } from '../bot.service';

/**
 * A pure description of a Bot API call: its method name, payload, and how to
 * enrich the raw result. It holds no token and performs no I/O — the transport
 * ({@link BotService.call}) runs the request pipeline, serializes, sends, and
 * then calls {@link wrap}. Keeping the command a plain value object means a
 * handler can `return new SendMessage(...)` and a test can assert on
 * `method`/`payload` with no network mocks — and nothing can bypass the
 * pipeline by sending itself.
 */
// The interface/class halves below merge into one type. The interface half
// exists so generated subclasses may override `hasMedia`/`isAttachMedia` with
// accessors — a class property declaration would forbid that (TS2611) — and
// merged declarations must repeat identical type parameters even though each
// half uses only one of them.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- this half uses only TResult
export interface ApiMethod<TOptions, TResult> {
  /** Enrich Telegram's raw result (e.g. wrap it in a rich `Message`). */
  wrap?(raw: unknown, bot: BotService): TResult;
  /** The payload carries a file part, so it must be sent as multipart form-data. */
  hasMedia?: boolean;
  /** Files are nested in the payload and need `attach://` references. */
  isAttachMedia?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- this half uses only TOptions
export abstract class ApiMethod<TOptions, TResult> {
  /** Bot API method name, e.g. `sendMessage`. */
  abstract readonly method: string;
  readonly payload?: TOptions;

  protected constructor(payload?: TOptions) {
    this.payload = payload;
  }
}

/** The (possibly enriched) result a command object resolves to — its `TResult`. */
export type ResultOf<M> = M extends ApiMethod<unknown, infer R> ? R : never;
