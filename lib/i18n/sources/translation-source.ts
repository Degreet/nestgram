import type { Translations } from '../i18n.types';

/**
 * A source of translation catalogs. The seam for loading catalogs from anywhere
 * — a directory of files, a database, a remote service — instead of inlining a
 * `translations` object. Loaded ONCE, eagerly, when `I18nModule` initialises, so
 * there is no per-update I/O; the resolved {@link Translations} are cached.
 *
 * It's a one-method interface on purpose: a custom source is trivial to write
 * (no privileged core), and built-ins like {@link directoryTranslations} just
 * implement it.
 */
export interface TranslationSource {
  load(): Promise<Translations> | Translations;
}
