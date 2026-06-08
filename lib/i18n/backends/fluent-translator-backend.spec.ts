import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';

import { I18nManager } from '../i18n-manager';
import { I18nModule } from '../i18n.module';
import { fluentBackend, fluentDirectory } from './fluent-translator-backend';

const EN_FTL = [
  'hi = Hello, { $name }!',
  'unread = { $count ->',
  '  [one] You have one message.',
  ' *[other] You have { $count } messages.',
  '}',
].join('\n');

const UK_FTL = 'hi = Привіт, { $name }!';

describe('fluentBackend', () => {
  it('formats simple messages, runs selectors/plurals, no isolation marks by default', async () => {
    const backend = await fluentBackend({ en: EN_FTL, uk: UK_FTL });

    expect(backend.hasLocale('en')).toBe(true);
    expect(backend.hasLocale('de')).toBe(false);

    expect(backend.format('en', 'hi', { name: 'Ann' })).toBe('Hello, Ann!');
    expect(backend.format('en', 'unread', { count: 1 })).toBe(
      'You have one message.',
    );
    expect(backend.format('en', 'unread', { count: 5 })).toBe(
      'You have 5 messages.',
    );
    expect(backend.format('uk', 'hi', { name: 'Оля' })).toBe('Привіт, Оля!');
  });

  it('returns undefined for a key the locale does not have', async () => {
    const backend = await fluentBackend({ en: EN_FTL });
    expect(backend.format('en', 'nope')).toBeUndefined();
  });

  it('keeps Unicode bidi isolation marks when asked', async () => {
    const backend = await fluentBackend({ en: EN_FTL }, { useIsolating: true });
    expect(backend.format('en', 'hi', { name: 'Ann' })).toBe('Hello, ⁨Ann⁩!');
  });

  it('throws a clear error on a Fluent resource error (duplicate id)', async () => {
    await expect(fluentBackend({ en: 'dup = a\ndup = b' })).rejects.toThrow(
      /Fluent error.*override/s,
    );
  });

  it('loads .ftl files from a directory and wires through I18nModule', async () => {
    const dir = await fs.mkdtemp(join(tmpdir(), 'nestgram-ftl-'));
    await fs.writeFile(join(dir, 'en.ftl'), EN_FTL);
    await fs.writeFile(join(dir, 'README.md'), 'ignore');

    let app: INestApplicationContext | undefined;
    try {
      const fromDir = await fluentDirectory(dir);
      expect(fromDir.format('en', 'unread', { count: 2 })).toBe(
        'You have 2 messages.',
      );

      @Module({
        imports: [
          I18nModule.forRootAsync({
            useFactory: async () => ({
              backend: await fluentDirectory(dir),
              defaultLocale: 'en',
            }),
          }),
        ],
      })
      class FluentAppModule {}

      app = await NestFactory.createApplicationContext(FluentAppModule, {
        logger: false,
      });
      expect(app.get(I18nManager).translator('en')('hi', { name: 'Bo' })).toBe(
        'Hello, Bo!',
      );
    } finally {
      await app?.close();
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
