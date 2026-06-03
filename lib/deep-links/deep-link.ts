import { Logger } from '@nestjs/common';

import {
  DeepLinkQuery,
  STARTAPP_PARAM_MAX_LENGTH,
  START_PARAM_MAX_LENGTH,
  TELEGRAM_LINK_BASE,
  VALID_DEEP_LINK_PARAM,
} from './deep-link.constants';

const logger = new Logger('DeepLink');

/** A deep-link parameter value; a number is coerced to its decimal string. */
type ParamValue = string | number;

/**
 * Exactly one start variant — a Telegram link carries a single one:
 *   - `start`      → `/start <param>` in a private chat (referral links)
 *   - `startGroup` → add the bot to a group, then `/start <param>`
 *   - `startApp`   → open the bot's Main Mini App with `start_param`
 *
 * The `?: never` neighbours make "exactly one" a compile-time guarantee: a
 * plain union would let excess-property checking wave a second variant through.
 */
export type DeepLinkParams =
  | { start: ParamValue; startGroup?: never; startApp?: never }
  | { startGroup: ParamValue; start?: never; startApp?: never }
  | { startApp: ParamValue; start?: never; startGroup?: never };

/**
 * Build a `https://t.me/<username>` deep link. A leading `@` on the username is
 * stripped. With no params it is the bare profile link; otherwise the single
 * start variant becomes the query parameter.
 *
 * The parameter is validated against Telegram's rules (charset `A–Za–z0–9_-`,
 * length per kind) and a violation is warned — the link is still returned so the
 * mistake is visible, not silently swallowed.
 *
 * ```ts
 * deepLink('mybot', { start: 'ref_42' });   // https://t.me/mybot?start=ref_42
 * deepLink('mybot', { startApp: 'promo' });  // https://t.me/mybot?startapp=promo
 * deepLink('mybot');                         // https://t.me/mybot
 * ```
 */
export function deepLink(username: string, params?: DeepLinkParams): string {
  const handle = username.startsWith('@') ? username.slice(1) : username;
  if (handle.length === 0) {
    logger.warn('deepLink(username) was given an empty username.');
  }

  const base = `${TELEGRAM_LINK_BASE}/${handle}`;
  if (!params) {
    return base;
  }

  // `?: never` neighbours let `params.x` be read across the union; the explicit
  // `!== undefined` checks narrow cleanly to the present variant.
  if (params.start !== undefined) {
    return withParam(
      base,
      DeepLinkQuery.Start,
      params.start,
      START_PARAM_MAX_LENGTH,
    );
  }
  if (params.startGroup !== undefined) {
    return withParam(
      base,
      DeepLinkQuery.StartGroup,
      params.startGroup,
      START_PARAM_MAX_LENGTH,
    );
  }
  return withParam(
    base,
    DeepLinkQuery.StartApp,
    params.startApp,
    STARTAPP_PARAM_MAX_LENGTH,
  );
}

function withParam(
  base: string,
  key: string,
  raw: ParamValue,
  maxLength: number,
): string {
  const value = String(raw);
  validateParam(key, value, maxLength);
  return `${base}?${key}=${value}`;
}

function validateParam(key: string, value: string, maxLength: number): void {
  if (value.length === 0 || value.length > maxLength) {
    logger.warn(
      `Deep-link "${key}" must be 1–${maxLength} characters (got ${value.length}).`,
    );
  }
  if (value.length > 0 && !VALID_DEEP_LINK_PARAM.test(value)) {
    logger.warn(
      `Deep-link "${key}" value "${value}" has characters Telegram rejects; ` +
        'allowed: A–Z a–z 0–9 _ -.',
    );
  }
}
