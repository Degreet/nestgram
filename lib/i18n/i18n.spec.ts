import { runAmbient } from '../ambient';
import { TelegramExecutionContext } from '../engine/context';
import { NestgramModuleOptions } from '../module/nestgram-module.types';
import { I18nManager } from './i18n-manager';
import { interpolate, locale, t } from './translate';
import type { I18nOptions } from './i18n.types';

const TRANSLATIONS = {
  en: { hi: 'Hello, {name}!', bye: 'Bye' },
  uk: { hi: 'Привіт, {name}!' }, // no `bye` — exercises fallback
};

function manager(i18n?: Partial<I18nOptions>): I18nManager {
  const options = {
    token: 'TEST',
    i18n: i18n && { translations: TRANSLATIONS, defaultLocale: 'en', ...i18n },
  } as NestgramModuleOptions;
  return new I18nManager(options);
}

function ctxWithLanguage(language_code?: string): TelegramExecutionContext {
  return { from: { language_code } } as TelegramExecutionContext;
}

describe('interpolate', () => {
  it('splices params and leaves unmatched placeholders visible', () => {
    expect(interpolate('Hello, {name}!', { name: 'Ann' })).toBe('Hello, Ann!');
    expect(interpolate('{a}/{b}', { a: 1 })).toBe('1/{b}');
    expect(interpolate('plain')).toBe('plain');
  });

  it('does not pull inherited Object.prototype keys for a placeholder', () => {
    expect(interpolate('{toString}', { name: 'Ann' })).toBe('{toString}');
  });
});

describe('free t() / locale() without i18n', () => {
  it('return the key and undefined outside an ambient context', () => {
    expect(t('hi')).toBe('hi');
    expect(locale()).toBeUndefined();
  });

  it('return the key when i18n is not configured', () => {
    runAmbient(() => {
      manager(undefined).resolve(ctxWithLanguage('uk'));
      expect(t('hi', { name: 'Ann' })).toBe('hi');
      expect(locale()).toBeUndefined();
    });
  });
});

describe('I18nManager.resolve', () => {
  it('resolves the sender language and translates with interpolation', () => {
    runAmbient(() => {
      manager({}).resolve(ctxWithLanguage('uk'));
      expect(locale()).toBe('uk');
      expect(t('hi', { name: 'Ann' })).toBe('Привіт, Ann!');
    });
  });

  it('falls back to the default locale for a key missing in the catalog', () => {
    runAmbient(() => {
      manager({}).resolve(ctxWithLanguage('uk'));
      expect(t('bye')).toBe('Bye'); // uk has no `bye` -> en fallback
    });
  });

  it('uses the default locale for an unknown language', () => {
    runAmbient(() => {
      manager({}).resolve(ctxWithLanguage('de'));
      expect(locale()).toBe('en');
      expect(t('hi', { name: 'Ann' })).toBe('Hello, Ann!');
    });
  });

  it('honors a custom locale resolver', () => {
    runAmbient(() => {
      manager({ resolveLocale: () => 'uk' }).resolve(ctxWithLanguage('en'));
      expect(locale()).toBe('uk');
    });
  });

  it('returns the key for a key missing everywhere', () => {
    runAmbient(() => {
      manager({}).resolve(ctxWithLanguage('en'));
      expect(t('nope')).toBe('nope');
    });
  });

  it('ignores a language_code matching an Object.prototype key', () => {
    runAmbient(() => {
      manager({}).resolve(ctxWithLanguage('toString'));
      expect(locale()).toBe('en'); // not 'toString'
    });
  });
});
