import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { DynamicModule, INestApplicationContext } from '@nestjs/common';

import { fluentDirectory } from '../backends/fluent-translator-backend';
import { I18nService } from '../i18n.service';
import { I18nModule } from '../i18n.module';
import { DirectoryTranslationSource } from './directory-translation-source';

async function makeLocaleDir(): Promise<string> {
  const dir = await fs.mkdtemp(join(tmpdir(), 'nestgram-i18n-'));
  await fs.writeFile(
    join(dir, 'en.json'),
    JSON.stringify({ hi: 'Hello, {name}!', cart: { empty: 'Empty' } }),
  );
  await fs.writeFile(
    join(dir, 'uk.yaml'),
    'hi: "Привіт, {name}!"\ncart:\n  empty: "Порожньо"\n',
  );
  await fs.writeFile(join(dir, 'README.md'), '# ignore me');
  return dir;
}

async function withTempDir(
  prefix: string,
  files: Record<string, string>,
  assert: (dir: string) => Promise<void>,
): Promise<void> {
  const dir = await fs.mkdtemp(join(tmpdir(), prefix));
  try {
    for (const [name, content] of Object.entries(files)) {
      await fs.writeFile(join(dir, name), content);
    }
    await assert(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

describe('DirectoryTranslationSource', () => {
  let dir: string;

  beforeAll(async () => {
    dir = await makeLocaleDir();
  });

  afterAll(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('loads one locale per file, parses JSON + YAML, flattens, ignores other files', async () => {
    const translations = await new DirectoryTranslationSource(dir).load();

    expect(translations).toEqual({
      en: { hi: 'Hello, {name}!', 'cart.empty': 'Empty' },
      uk: { hi: 'Привіт, {name}!', 'cart.empty': 'Порожньо' },
    });
  });

  it('throws a clear error when the directory does not exist', async () => {
    await expect(
      new DirectoryTranslationSource(join(dir, 'does-not-exist')).load(),
    ).rejects.toThrow(/locales directory/);
  });

  it('throws on a duplicate locale (en.json + en.yaml)', async () => {
    await withTempDir(
      'nestgram-i18n-dup-',
      { 'en.json': '{"a":"1"}', 'en.yaml': 'a: "2"' },
      async (dup) =>
        expect(new DirectoryTranslationSource(dup).load()).rejects.toThrow(
          /Duplicate locale "en"/,
        ),
    );
  });

  it('throws rather than yielding an empty catalog when no locale file matches', async () => {
    await withTempDir(
      'nestgram-i18n-empty-',
      { 'README.md': '# nothing here' },
      async (empty) =>
        expect(new DirectoryTranslationSource(empty).load()).rejects.toThrow(
          /No locale files/,
        ),
    );
  });

  it('points at the Fluent backend when the directory holds only .ftl files', async () => {
    await withTempDir(
      'nestgram-i18n-ftl-',
      { 'en.ftl': 'hi = Hello' },
      async (ftl) =>
        // Matched against the real export: deleting it breaks the import, and
        // renaming it fails here — either way the message can't quietly come to
        // name an API that no longer exists.
        expect(new DirectoryTranslationSource(ftl).load()).rejects.toThrow(
          new RegExp(fluentDirectory.name),
        ),
    );
  });

  describe('flattening', () => {
    it('dots nested keys and coerces non-string leaves', async () => {
      await withTempDir(
        'nestgram-i18n-flat-',
        {
          'en.json': JSON.stringify({
            a: { b: { c: 'deep' } },
            count: 7,
            on: true,
          }),
        },
        async (flat) => {
          const { en } = await new DirectoryTranslationSource(flat).load();
          expect(en).toEqual({ 'a.b.c': 'deep', count: '7', on: 'true' });
        },
      );
    });

    it('treats an array as a leaf, joined by newlines', async () => {
      await withTempDir(
        'nestgram-i18n-arr-',
        { 'en.json': JSON.stringify({ help: ['line 1', 'line 2'] }) },
        async (arr) => {
          const { en } = await new DirectoryTranslationSource(arr).load();
          expect(en).toEqual({ help: 'line 1\nline 2' });
        },
      );
    });

    // A root that isn't an object flattens to no keys, so the locale would load
    // "successfully" and then render every key as itself.
    it.each([
      ['an empty object', '{}'],
      ['null', 'null'],
      ['a bare scalar', '"nope"'],
    ])('throws when a locale file holds %s', async (_label, content) => {
      await withTempDir(
        'nestgram-i18n-scalar-',
        { 'en.json': content },
        async (bad) =>
          expect(new DirectoryTranslationSource(bad).load()).rejects.toThrow(
            /holds no keys/,
          ),
      );
    });
  });

  it('wires through I18nModule.forRoot({ source: <path> }) end to end', async () => {
    const app = await bootstrap(
      I18nModule.forRoot({ source: dir, defaultLocale: 'en' }),
    );
    try {
      const i18n = app.get(I18nService);
      expect(i18n.t('hi', { name: 'Ann' }, 'uk')).toBe('Привіт, Ann!');
      expect(i18n.t('cart.empty', 'en')).toBe('Empty');
    } finally {
      await app.close();
    }
  });

  it('accepts a custom TranslationSource object as the escape hatch', async () => {
    const app = await bootstrap(
      I18nModule.forRoot({
        source: { load: () => ({ en: { hi: 'from a custom source' } }) },
        defaultLocale: 'en',
      }),
    );
    try {
      expect(app.get(I18nService).t('hi')).toBe('from a custom source');
    } finally {
      await app.close();
    }
  });

  it('rejects when both translations and source are configured', async () => {
    const bad = I18nModule.forRoot({
      translations: { en: { hi: 'Hi' } },
      source: dir,
      defaultLocale: 'en',
    });
    await expect(
      NestFactory.createApplicationContext(buildModule(bad), {
        logger: false,
        abortOnError: false,
      }),
    ).rejects.toThrow(/exactly one/);
  });
});

function bootstrap(i18n: DynamicModule): Promise<INestApplicationContext> {
  return NestFactory.createApplicationContext(buildModule(i18n), {
    logger: false,
  });
}

function buildModule(i18n: DynamicModule) {
  @Module({ imports: [i18n] })
  class SourceAppModule {}
  return SourceAppModule;
}
