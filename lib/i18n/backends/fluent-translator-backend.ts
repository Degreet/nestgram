import { promises as fs } from 'fs';
import { basename, extname, join } from 'path';

import { NestgramConfigError } from '../../exceptions';
import type { TranslateParams } from '../i18n.types';
import type { TranslatorBackend } from './translator-backend';

const FLUENT_EXTENSION = '.ftl';

/** Options for the Fluent backend. */
export interface FluentBackendOptions {
  /**
   * Wrap interpolated variables in Unicode bidi isolation marks (Fluent's
   * default). Off here by default — those marks are invisible characters that
   * surprise in bot messages; turn on only for genuinely mixed-direction text.
   */
  useIsolating?: boolean;
}

/**
 * The slice of `@fluent/bundle`'s `FluentBundle` we use — a structural type so
 * the optional `@fluent/bundle` dependency never leaks into the published types
 * (only the runtime, lazily imported, needs it installed).
 */
interface FluentBundleLike {
  getMessage(id: string): { value: unknown } | null | undefined;
  formatPattern(
    pattern: unknown,
    args?: Record<string, unknown> | null,
    errors?: Error[] | null,
  ): string;
}

/**
 * A {@link TranslatorBackend} over Fluent (projectfluent.org) — `.ftl` messages
 * with runtime selectors, plurals and terms, one {@link https://projectfluent.org}
 * bundle per locale. Built by {@link fluentBackend} / {@link fluentDirectory},
 * not `new`.
 */
class FluentTranslatorBackend implements TranslatorBackend {
  constructor(private readonly bundles: Map<string, FluentBundleLike>) {}

  hasLocale(locale: string): boolean {
    return this.bundles.has(locale);
  }

  format(
    locale: string,
    key: string,
    params?: TranslateParams,
  ): string | undefined {
    const bundle = this.bundles.get(locale);
    const message = bundle?.getMessage(key);
    if (!bundle || !message?.value) {
      return undefined;
    }
    // Pass an errors array so a runtime error (e.g. a missing variable) yields a
    // best-effort string instead of throwing — a bot should still send a reply.
    return bundle.formatPattern(message.value, params ?? null, []);
  }
}

async function importFluent(): Promise<typeof import('@fluent/bundle')> {
  try {
    return await import('@fluent/bundle');
  } catch {
    throw new NestgramConfigError(
      "Fluent translations need the optional '@fluent/bundle' package — run " +
        '`npm i @fluent/bundle`.',
    );
  }
}

/**
 * Build a Fluent {@link TranslatorBackend} from inline `.ftl` strings, one per
 * locale. Async — it lazily loads the optional `@fluent/bundle` and parses each
 * resource once. An `addResource` error (e.g. a duplicate message id) fails
 * fast; note `@fluent/bundle` silently skips a malformed message, which then
 * reads as a missing key (visible with `logMissingKeys`). Use via `forRootAsync`:
 *
 * ```ts
 * I18nModule.forRootAsync({
 *   useFactory: async () => ({
 *     backend: await fluentBackend({ en: enFtl, uk: ukFtl }),
 *     defaultLocale: 'en',
 *   }),
 * });
 * ```
 */
export async function fluentBackend(
  resources: Record<string, string>,
  options: FluentBackendOptions = {},
): Promise<TranslatorBackend> {
  const fluent = await importFluent();
  const useIsolating = options.useIsolating ?? false;
  const bundles = new Map<string, FluentBundleLike>();

  for (const [locale, ftl] of Object.entries(resources)) {
    const bundle = new fluent.FluentBundle(locale, { useIsolating });
    const errors = bundle.addResource(new fluent.FluentResource(ftl));
    if (errors.length > 0) {
      throw new NestgramConfigError(
        `Fluent error(s) in locale "${locale}": ` +
          errors.map((error) => String(error)).join('; '),
      );
    }
    bundles.set(locale, bundle);
  }

  return new FluentTranslatorBackend(bundles);
}

/**
 * Build a Fluent {@link TranslatorBackend} from a directory of `<locale>.ftl`
 * files — the Fluent counterpart of {@link directoryTranslations}. Async; reads
 * the files then delegates to {@link fluentBackend}.
 */
export async function fluentDirectory(
  directory: string,
  options?: FluentBackendOptions,
): Promise<TranslatorBackend> {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch {
    throw new NestgramConfigError(
      `Could not read Fluent locales directory: ${directory}`,
    );
  }

  const resources: Record<string, string> = {};
  for (const entry of entries) {
    if (
      !entry.isFile() ||
      extname(entry.name).toLowerCase() !== FLUENT_EXTENSION
    ) {
      continue;
    }
    const locale = basename(entry.name, FLUENT_EXTENSION);
    if (Object.hasOwn(resources, locale)) {
      throw new NestgramConfigError(
        `Duplicate locale "${locale}" in ${directory} — one .ftl file per locale`,
      );
    }
    resources[locale] = await fs.readFile(join(directory, entry.name), 'utf8');
  }

  return fluentBackend(resources, options);
}
