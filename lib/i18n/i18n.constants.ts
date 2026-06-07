/** Ambient-store key under which the current update's resolved locale lives. */
export const LOCALE = Symbol('nestgram:locale');

/**
 * Ambient-store key for the locale-bound translator function, so the free
 * {@link t} helper can translate without DI — `I18nManager` seeds it per update.
 */
export const TRANSLATOR = Symbol('nestgram:translator');
