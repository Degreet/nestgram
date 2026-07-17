import type { Translations } from '../i18n.types';

/**
 * A source of translation catalogs. The seam for loading catalogs from anywhere
 * — a database, a remote service — instead of inlining a `translations` object.
 * Loaded ONCE, eagerly, when `I18nModule` initialises, so there is no per-update
 * I/O; the resolved {@link Translations} are cached.
 *
 * For the common case — a directory of `<locale>.json` / `.yaml` files — pass the
 * path itself as `source` and the built-in loader handles it; implement this only
 * to load from somewhere else. It's a one-method interface on purpose: a custom
 * source is trivial to write (no privileged core).
 *
 * ```ts
 * I18nModule.forRoot({
 *   source: { load: () => db.loadCatalogs() },
 *   defaultLocale: 'en',
 * });
 * ```
 */
export interface TranslationSource {
  load(): Promise<Translations> | Translations;
}
