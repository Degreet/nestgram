/** Ambient-store key under which the current update's resolved locale lives. */
export const LOCALE = Symbol('nestgram:locale');

/**
 * Ambient-store key for the locale-bound translator function, so the free
 * {@link t} helper can translate without DI — `I18nManager` seeds it per update.
 */
export const TRANSLATOR = Symbol('nestgram:translator');

/**
 * Ambient-store key for the per-update translator factory (`locale -> translator`),
 * so `t(key, locale)` can translate into an explicit locale without DI.
 */
export const TRANSLATOR_FACTORY = Symbol('nestgram:translator-factory');
