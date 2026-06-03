/**
 * A mutable description of an outbound Bot API request, assembled before it is
 * serialized and sent. Request transformers receive this and may mutate it.
 */
export interface ApiRequest {
  /** Bot API method name, e.g. `sendMessage`. */
  method: string;
  /** Method payload; transformers may add to or change it in place. */
  payload: Record<string, unknown>;
  /** Bot token this request is sent with (overridable per call). */
  token: string;
}

/**
 * A hook that inspects or mutates an outbound request before it is sent — the
 * outbound counterpart to a Nest interceptor (which only sees inbound updates).
 *
 * The framework's own send-time behaviours (e.g. the default `parse_mode`) are
 * ordinary transformers; register your own via the {@link REQUEST_TRANSFORMERS}
 * multi-provider token to add cross-cutting behaviour — throttling, a custom
 * header, an injected field — without touching framework code. Every API call
 * funnels through the same pipeline, including ones built by hand.
 */
export interface RequestTransformer {
  transform(request: ApiRequest): void | Promise<void>;
}

/** Multi-provider DI token for the ordered list of {@link RequestTransformer}s. */
export const REQUEST_TRANSFORMERS = 'nestgram:request_transformers';
