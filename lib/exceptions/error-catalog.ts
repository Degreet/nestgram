/**
 * The one place that encodes "how Telegram phrases a given failure".
 *
 * Telegram ships no structured error catalog — many distinct failures share an
 * `error_code` (400 alone covers dozens), and the only signal that tells them
 * apart is the `description` string, whose wording Telegram controls and which
 * the API spec does not model. Without this table every bot re-derives a
 * brittle `error.description.includes('…')` check; here the phrasing lives once,
 * so {@link ApiException} predicates match a known failure by name and a Telegram
 * rewording is a one-line fix instead of breaking every user's bot.
 *
 * Intentionally NON-exhaustive (mirrors the codegen enum table): an unmatched
 * error stays a plain `ApiException`, never a wrong classification.
 */

/** A known Telegram failure: an `error_code` paired with the phrasing that identifies it. */
export interface ApiErrorMatcher {
  /** The Bot API `error_code` (HTTP-like status). */
  readonly code: number;
  /** A pattern tested against the failure's `description`. */
  readonly description: RegExp;
}

/**
 * The curated set of routine failures every bot eventually meets. Extend this
 * table (and add a matching predicate on {@link ApiException}) rather than
 * spreading substring checks through bot code.
 */
export const KnownApiError = {
  /** A double-edit with identical content — Telegram rejects the no-op. */
  notModified: { code: 400, description: /message is not modified/i },
  /** The user blocked the bot — a send to them can never succeed again. */
  blockedByUser: { code: 403, description: /bot was blocked by the user/i },
  /** The target chat does not exist (wrong id, or the bot was never there). */
  chatNotFound: { code: 400, description: /chat not found/i },
  /**
   * The message can no longer be edited — too old, already deleted, or not the
   * bot's own message. Distinct from {@link notModified} (a content no-op): here
   * the edit is genuinely impossible.
   */
  notEditable: {
    code: 400,
    description: /message can't be edited|message to edit not found/i,
  },
} as const satisfies Record<string, ApiErrorMatcher>;
