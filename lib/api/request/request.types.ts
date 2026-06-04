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
 * ordinary transformers run for every API call — including ones built by hand —
 * so the pipeline is the single send chokepoint. (User-registered transformers
 * are not wired yet: the `multi`-provider token that would allow it does not
 * aggregate in Nest 10.4.1; restoring that extension is tracked in task #35.)
 */
export interface RequestTransformer {
  transform(request: ApiRequest): void | Promise<void>;
}

/**
 * DI token for the ordered array of {@link RequestTransformer}s the pipeline
 * runs. Currently the built-in default-parse-mode hook only — see #35 for
 * restoring user-supplied transformers.
 */
export const REQUEST_TRANSFORMERS = 'nestgram:request_transformers';
