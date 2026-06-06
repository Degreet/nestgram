/**
 * A mutable description of an outbound Bot API request, assembled before it is
 * serialized and sent. {@link ApiInterceptor}s receive this (via
 * `context.getRequest()`) and may mutate it in place before the call goes out.
 */
export interface ApiRequest {
  /** Bot API method name, e.g. `sendMessage`. */
  method: string;
  /** Method payload; interceptors may add to or change it in place. */
  payload: Record<string, unknown>;
  /** Bot token this request is sent with (overridable per call). */
  token: string;
}
