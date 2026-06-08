import { promises as fs } from 'fs';
import { basename, extname, join } from 'path';

import { NestgramConfigError } from '../../exceptions';
import type { Translations } from '../i18n.types';
import { flattenCatalog } from './flatten';
import type { TranslationSource } from './translation-source';

/** File extensions a locale file may use; the locale is the filename without it. */
const SUPPORTED_EXTENSIONS = ['.json', '.yaml', '.yml'];

async function parseFile(extension: string, raw: string): Promise<unknown> {
  if (extension === '.json') {
    return JSON.parse(raw);
  }
  // .yaml / .yml — parsed by the optional `yaml` package, imported lazily so it
  // is only required when a YAML locale file is actually present.
  const yaml = await importYaml();
  return yaml.parse(raw);
}

async function importYaml(): Promise<typeof import('yaml')> {
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
 * Load translation catalogs from a directory, one file per locale — the
 * aiogram/grammY-style `locales/` folder. Each `<locale>.<ext>` file becomes a
 * locale: `en.json`, `uk.yaml`, `de.yml`. Files are parsed by extension (JSON
 * built in; YAML via the optional `yaml` package) and flattened to dotted keys,
 * so a file can nest keys naturally. Non-matching files are ignored.
 *
 * ```ts
 * I18nModule.forRoot({
 *   source: directoryTranslations(join(__dirname, 'locales')),
 *   defaultLocale: 'en',
 * });
 * ```
 */
export function directoryTranslations(directory: string): TranslationSource {
  return {
    async load(): Promise<Translations> {
      let entries;
      try {
        entries = await fs.readdir(directory, { withFileTypes: true });
      } catch {
        throw new NestgramConfigError(
          `Could not read i18n locales directory: ${directory}`,
        );
      }

      const translations: Translations = {};
      for (const entry of entries) {
        const extension = extname(entry.name).toLowerCase();
        if (!entry.isFile() || !SUPPORTED_EXTENSIONS.includes(extension)) {
          continue;
        }
        const locale = basename(entry.name, extension);
        if (Object.hasOwn(translations, locale)) {
          throw new NestgramConfigError(
            `Duplicate locale "${locale}" in ${directory} — one file per locale`,
          );
        }
        const raw = await fs.readFile(join(directory, entry.name), 'utf8');
        translations[locale] = flattenCatalog(await parseFile(extension, raw));
      }

      return translations;
    },
  };
}
