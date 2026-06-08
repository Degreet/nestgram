import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { DynamicModule, INestApplicationContext } from '@nestjs/common';

import { I18nManager } from '../i18n-manager';
import { I18nModule } from '../i18n.module';
import { directoryTranslations } from './directory-translation-source';

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

describe('directoryTranslations', () => {
  let dir: string;

  beforeAll(async () => {
    dir = await makeLocaleDir();
  });

  afterAll(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('loads one locale per file, parses JSON + YAML, flattens, ignores other files', async () => {
    const translations = await directoryTranslations(dir).load();

    expect(translations).toEqual({
      en: { hi: 'Hello, {name}!', 'cart.empty': 'Empty' },
      uk: { hi: 'Привіт, {name}!', 'cart.empty': 'Порожньо' },
    });
  });

  it('throws a clear error when the directory does not exist', async () => {
    await expect(
      directoryTranslations(join(dir, 'does-not-exist')).load(),
    ).rejects.toThrow(/locales directory/);
  });

  it('throws on a duplicate locale (en.json + en.yaml)', async () => {
    const dup = await fs.mkdtemp(join(tmpdir(), 'nestgram-i18n-dup-'));
    await fs.writeFile(join(dup, 'en.json'), '{"a":"1"}');
    await fs.writeFile(join(dup, 'en.yaml'), 'a: "2"');
    try {
      await expect(directoryTranslations(dup).load()).rejects.toThrow(
        /Duplicate locale "en"/,
      );
    } finally {
      await fs.rm(dup, { recursive: true, force: true });
    }
  });

  it('wires through I18nModule.forRoot({ source }) end to end', async () => {
    const app: INestApplicationContext =
      await NestFactory.createApplicationContext(
        buildModule(
          I18nModule.forRoot({
            source: directoryTranslations(dir),
            defaultLocale: 'en',
          }),
        ),
        { logger: false },
      );
    try {
      const i18n = app.get(I18nManager);
      expect(i18n.translator('uk')('hi', { name: 'Ann' })).toBe('Привіт, Ann!');
      expect(i18n.translator('en')('cart.empty')).toBe('Empty');
    } finally {
      await app.close();
    }
  });

  it('rejects when both translations and source are configured', async () => {
    const bad = I18nModule.forRoot({
      translations: { en: { hi: 'Hi' } },
      source: directoryTranslations(dir),
      defaultLocale: 'en',
    });
    await expect(
      NestFactory.createApplicationContext(buildModule(bad), {
        logger: false,
        abortOnError: false,
      }),
    ).rejects.toThrow(/either|both/);
  });
});

function buildModule(i18n: DynamicModule) {
  @Module({ imports: [i18n] })
  class SourceAppModule {}
  return SourceAppModule;
}
