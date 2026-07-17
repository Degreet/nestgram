import { Dirent, promises as fs } from 'fs';
import { basename, extname, join } from 'path';

import { NestgramConfigError } from '../../exceptions';
import { FLUENT_EXTENSION } from '../i18n.constants';
import type { Translations } from '../i18n.types';
import type { TranslationSource } from './translation-source';

/**
 * Loads translation catalogs from a directory, one file per locale — the
 * aiogram/grammY-style `locales/` folder. Each `<locale>.<ext>` file becomes a
 * locale: `en.json`, `uk.yaml`, `de.yml`. Files are parsed by extension (JSON
 * built in; YAML via the optional `yaml` package) and flattened to dotted keys,
 * so a file can nest keys naturally. Non-matching files are ignored.
 *
 * You normally never name it — `I18nModule` builds it whenever `source` is a
 * path:
 *
 * ```ts
 * I18nModule.forRoot({
 *   source: join(__dirname, 'locales'),
 *   defaultLocale: 'en',
 * });
 * ```
 *
 * It's exported for composing on top of it, since a {@link TranslationSource} is
 * just a `load()` — merging two directories, or falling back to a DB, shouldn't
 * mean reimplementing the file walk:
 *
 * ```ts
 * source: {
 *   load: async () => ({
 *     ...(await new DirectoryTranslationSource(base).load()),
 *     ...(await new DirectoryTranslationSource(overrides).load()),
 *   }),
 * },
 * ```
 */
export class DirectoryTranslationSource implements TranslationSource {
  private static readonly JSON_EXTENSION = '.json';
  private static readonly YAML_EXTENSIONS = ['.yaml', '.yml'];
  private static readonly SUPPORTED_EXTENSIONS = [
    this.JSON_EXTENSION,
    ...this.YAML_EXTENSIONS,
  ];
  constructor(private readonly directory: string) {}

  async load(): Promise<Translations> {
    const translations: Translations = {};
    let sawFluent = false;

    for (const entry of await this.readDirectory()) {
      if (!entry.isFile()) {
        continue;
      }
      const extension = extname(entry.name).toLowerCase();
      if (extension === FLUENT_EXTENSION) {
        sawFluent = true;
        continue;
      }
      if (
        !DirectoryTranslationSource.SUPPORTED_EXTENSIONS.includes(extension)
      ) {
        continue;
      }

      const locale = basename(entry.name, extension);
      if (Object.hasOwn(translations, locale)) {
        throw new NestgramConfigError(
          `Duplicate locale "${locale}" in ${this.directory} — one file per locale`,
        );
      }
      const raw = await fs.readFile(join(this.directory, entry.name), 'utf8');
      const catalog = DirectoryTranslationSource.flatten(
        await DirectoryTranslationSource.parse(extension, raw),
      );
      // A file parsing to `{}`, `null` or a bare scalar flattens to no keys at
      // all — every lookup against it would render as the key itself. That is
      // the silent failure this loader exists to prevent, so name it here.
      if (Object.keys(catalog).length === 0) {
        throw new NestgramConfigError(
          `Locale file "${entry.name}" in ${this.directory} holds no keys`,
        );
      }
      translations[locale] = catalog;
    }

    if (Object.keys(translations).length === 0) {
      throw new NestgramConfigError(this.noLocalesMessage(sawFluent));
    }
    return translations;
  }

  private async readDirectory(): Promise<Dirent[]> {
    try {
      return await fs.readdir(this.directory, { withFileTypes: true });
    } catch {
      throw new NestgramConfigError(
        `Could not read i18n locales directory: ${this.directory}`,
      );
    }
  }

  private noLocalesMessage(sawFluent: boolean): string {
    if (sawFluent) {
      return (
        `Only Fluent (${FLUENT_EXTENSION}) files in ` +
        `${this.directory}, which a path \`source\` cannot load — Fluent is a ` +
        'different message format and loads through its own backend: ' +
        '`I18nModule.forRootAsync({ useFactory: async () => ({ backend: await ' +
        'fluentDirectory(dir), defaultLocale: "en" }) })`'
      );
    }
    return (
      `No locale files in ${this.directory} — expected one <locale>.<ext> file ` +
      `per locale (${DirectoryTranslationSource.SUPPORTED_EXTENSIONS.join(
        ', ',
      )}), ` +
      'e.g. en.json'
    );
  }

  private static async parse(extension: string, raw: string): Promise<unknown> {
    if (extension === this.JSON_EXTENSION) {
      return JSON.parse(raw);
    }
    const yaml = await this.importYaml();
    return yaml.parse(raw);
  }

  /**
   * Imported lazily so `yaml` is only needed when a YAML locale file is actually
   * present — it is an optional peer dependency.
   */
  private static async importYaml(): Promise<typeof import('yaml')> {
    try {
      return await import('yaml');
    } catch {
      throw new NestgramConfigError(
        "YAML locale files need the optional 'yaml' package — run `npm i yaml`, " +
          'or use JSON files instead.',
      );
    }
  }

  /**
   * Flatten a nested catalog into the flat `key -> template` map the translator
   * uses, dotting nested keys: `{ cart: { empty: 'x' } }` -> `{ 'cart.empty': 'x' }`.
   * Lets a file group keys naturally while the runtime stays flat.
   */
  private static flatten(value: unknown): Record<string, string> {
    const out: Record<string, string> = {};
    this.collect(value, '', out);
    return out;
  }

  /**
   * Leaf values are coerced to strings; an array is a leaf (joined), since a
   * catalog value is a single template.
   */
  private static collect(
    value: unknown,
    prefix: string,
    out: Record<string, string>,
  ): void {
    if (value === null || typeof value !== 'object') {
      if (prefix) {
        out[prefix] = String(value);
      }
      return;
    }
    if (Array.isArray(value)) {
      if (prefix) {
        out[prefix] = value.map(String).join('\n');
      }
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      this.collect(child, prefix ? `${prefix}.${key}` : key, out);
    }
  }
}
