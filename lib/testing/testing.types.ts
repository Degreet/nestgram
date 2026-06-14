import type { ApiRequest } from '../api/request';

/**
 * One outgoing Bot API call the harness captured instead of sending. `method` is
 * the Bot API method name (`sendMessage`, `answerCallbackQuery`, …) and `payload`
 * is the FINAL request payload — after every built-in interceptor (default
 * parse-mode, rich-messages, …) has run, so it is exactly what would have gone on
 * the wire. Assert on it with `expect(bot.sent[0]).toMatchObject({ method, payload })`.
 */
export interface SentCall {
  method: string;
  payload: Record<string, unknown>;
}

/**
 * A stubbed Bot API response for one method. Receives the captured
 * {@link ApiRequest} and returns the RAW result Telegram would have put in
 * `response.result` (the harness then runs the method's own `wrap()` over it, so
 * the handler still gets a rich `Message`/`User`/…). Sync or async.
 */
export type ApiResponder = (request: ApiRequest) => unknown | Promise<unknown>;

/**
 * Per-field overrides for a fake update. A deep-ish merge target: top-level keys
 * replace the defaults, so pass a whole nested object (e.g. `{ chat: {...} }`) to
 * override a nested default wholesale.
 */
export interface UpdateOverrides {
  /** Override the synthetic `update_id` (defaults to an auto-incrementing value). */
  updateId?: number;
  /** Override the sender (`from`) — merged over the default test user. */
  from?: Partial<TestUser>;
  /** Override the chat — merged over the default private chat. */
  chat?: Partial<TestChat>;
  /** Override the `message_id` of the synthetic message. */
  messageId?: number;
  /** Override the Unix `date` of the synthetic message (defaults to a fixed value). */
  date?: number;
}

/** The minimal sender shape the update factory fills in (a Bot API `User`). */
export interface TestUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

/** The minimal chat shape the update factory fills in (a Bot API `Chat`). */
export interface TestChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}
