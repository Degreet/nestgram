/** Ambient-store key under which the current update's resolved locale lives. */
export const LOCALE = Symbol('nestgram:locale');

/**
 * Ambient-store key for the translate implementation, seeded per update by
 * `I18nService`. The free {@link t} helper reads it, so the helper is a door
 * onto the service rather than a second implementation of translation.
 */
export const TRANSLATE = Symbol('nestgram:translate');

/**
 * Extension of a Fluent catalog file. Shared because two modules must agree on
 * it: `FluentTranslatorBackend` reads these files, and the directory source
 * recognises them only to say they belong to that backend, not to it.
 */
export const FLUENT_EXTENSION = '.ftl';
