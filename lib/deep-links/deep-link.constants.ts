/** Base of every Telegram deep link. */
export const TELEGRAM_LINK_BASE = 'https://t.me';

/** Telegram deep-link param charset: A–Z a–z 0–9 _ - (base64url-safe). */
export const VALID_DEEP_LINK_PARAM = /^[A-Za-z0-9_-]+$/;

/** Max length of a `start` / `startgroup` parameter. */
export const START_PARAM_MAX_LENGTH = 64;

/** Max length of a `startapp` (Mini App) parameter. */
export const STARTAPP_PARAM_MAX_LENGTH = 512;

/** Wire query-parameter name for each deep-link variant. */
export const DeepLinkQuery = {
  Start: 'start',
  StartGroup: 'startgroup',
  StartApp: 'startapp',
} as const;
