import { Logger, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { runAmbient } from '../ambient';
import { TelegramExecutionContext } from '../engine/context';
import { FlatTranslatorBackend } from './backends';
import { I18nModule } from './i18n.module';
import { I18nService } from './i18n.service';
import { locale, t } from './translate';
import type { ResolvedI18nOptions } from './i18n.types';

const TRANSLATIONS = {
  en: { hi: 'Hello, {name}!', bye: 'Bye' },
  uk: { hi: 'Привіт, {name}!' }, // no `bye` — exercises fallback
};

function manager(
  extra?: Partial<Omit<ResolvedI18nOptions, 'backend'>>,
): I18nService {
  const config = extra && {
    backend: new FlatTranslatorBackend(TRANSLATIONS),
    defaultLocale: 'en',
    devMode: false,
    ...extra,
  };
  return new I18nService(config);
}

function ctxWithLanguage(language_code?: string): TelegramExecutionContext {
  return { from: { language_code } } as TelegramExecutionContext;
}

describe('FlatTranslatorBackend interpolation', () => {
  const backend = new FlatTranslatorBackend({
    en: {
      hi: 'Hello, {name}!',
      pair: '{a}/{b}',
      plain: 'plain',
      inherited: '{toString}',
    },
  });

  it('splices params and leaves unmatched placeholders visible', () => {
    expect(backend.format('en', 'hi', { name: 'Ann' })).toBe('Hello, Ann!');
    expect(backend.format('en', 'pair', { a: 1 })).toBe('1/{b}');
    expect(backend.format('en', 'plain')).toBe('plain');
  });

  it('does not pull inherited Object.prototype keys for a placeholder', () => {
    expect(backend.format('en', 'inherited', { name: 'Ann' })).toBe(
      '{toString}',
    );
  });

  it('does not pull an inherited Object.prototype key as a catalog key', () => {
    expect(backend.format('en', 'toString')).toBeUndefined();
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

describe('I18nService.resolve', () => {
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

describe('free t() with an explicit locale', () => {
  it('translates into the given locale, not the ambient one', () => {
    runAmbient(() => {
      manager({}).resolve(ctxWithLanguage('en')); // ambient locale = en
      expect(t('hi', { name: 'Ann' })).toBe('Hello, Ann!'); // ambient
      expect(t('hi', 'uk')).toBe('Привіт, {name}!'); // explicit, no params
      expect(t('hi', { name: 'Ann' }, 'uk')).toBe('Привіт, Ann!'); // explicit + params
    });
  });

  it('returns the key for an explicit locale outside any ambient context', () => {
    expect(t('hi', 'uk')).toBe('hi');
  });
});

describe('I18nService logMissingKeys', () => {
  it('warns once per missing locale+key when enabled, and not otherwise', () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    try {
      runAmbient(() => {
        manager({ logMissingKeys: true }).resolve(ctxWithLanguage('en'));
        expect(t('nope')).toBe('nope');
        expect(t('nope')).toBe('nope'); // deduped — no second warn
      });
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain('nope');
    } finally {
      warn.mockRestore();
    }
  });

  it('does not warn when the flag is off', () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    try {
      runAmbient(() => {
        manager({}).resolve(ctxWithLanguage('en'));
        expect(t('nope')).toBe('nope');
      });
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});

describe('I18nService.translator (explicit locale, no ambient)', () => {
  it('translates for a given locale outside any ambient context', () => {
    const translate = manager({}).translator('uk');
    expect(translate('hi', { name: 'Ann' })).toBe('Привіт, Ann!');
  });

  it('returns an identity translator when i18n is off', () => {
    expect(manager(undefined).translator('uk')('hi')).toBe('hi');
  });
});

describe('I18nService.t outside an update', () => {
  it('translates into an explicit locale where the free t() cannot', () => {
    const i18n = manager({});
    // The contrast that justifies the injected door: the free helper reads the
    // ambient rail, and outside an update there is nothing on it.
    expect(t('hi', { name: 'Ann' }, 'uk')).toBe('hi');
    expect(i18n.t('hi', { name: 'Ann' }, 'uk')).toBe('Привіт, Ann!');
    expect(i18n.t('hi', 'uk')).toBe('Привіт, {name}!');
  });

  it('falls back to the default locale when no locale is given', () => {
    expect(manager({}).t('hi', { name: 'Ann' })).toBe('Hello, Ann!');
  });

  it('still falls back across locales for a missing key', () => {
    expect(manager({}).t('bye', 'uk')).toBe('Bye'); // uk has no `bye` -> en
  });

  it('returns the key when i18n is off', () => {
    expect(manager(undefined).t('hi', 'uk')).toBe('hi');
  });
});

describe('devMode missing-key rendering', () => {
  it('renders a bare missing key as a visible marker', () => {
    expect(manager({ devMode: true }).t('nope')).toBe('⟨nope⟩');
  });

  it('lists each param on its own line', () => {
    expect(
      manager({ devMode: true }).t('nope', { name: 'Ann', count: 3 }),
    ).toBe('⟨nope\n  name: Ann\n  count: 3⟩');
  });

  it('renders a falsy param value rather than dropping it', () => {
    expect(manager({ devMode: true }).t('nope', { count: 0 })).toBe(
      '⟨nope\n  count: 0⟩',
    );
  });

  it('renders through the free t() on the ambient rail too', () => {
    runAmbient(() => {
      manager({ devMode: true }).resolve(ctxWithLanguage('en'));
      expect(t('nope', { id: 7 })).toBe('⟨nope\n  id: 7⟩');
    });
  });

  it('returns the bare key when devMode is off', () => {
    expect(manager({ devMode: false }).t('nope', { name: 'Ann' })).toBe('nope');
  });

  it('never touches a key that resolves — devMode changes only the miss path', () => {
    expect(manager({ devMode: true }).t('hi', { name: 'Ann' })).toBe(
      'Hello, Ann!',
    );
  });
});

describe('devMode default from NODE_ENV', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  async function missText(nodeEnv: string | undefined): Promise<string> {
    if (nodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = nodeEnv;
    }
    @Module({
      imports: [
        I18nModule.forRoot({ translations: TRANSLATIONS, defaultLocale: 'en' }),
      ],
    })
    class DevModeAppModule {}
    const app = await NestFactory.createApplicationContext(DevModeAppModule, {
      logger: false,
    });
    try {
      return app.get(I18nService).t('nope');
    } finally {
      await app.close();
    }
  }

  it('renders the debug marker only when NODE_ENV is development', async () => {
    expect(await missText('development')).toBe('⟨nope⟩');
  });

  it('fails closed to the bare key when NODE_ENV is unset', async () => {
    expect(await missText(undefined)).toBe('nope');
  });

  it('fails closed for a non-development env (e.g. staging)', async () => {
    expect(await missText('staging')).toBe('nope');
  });

  it('returns the bare key when NODE_ENV is production', async () => {
    expect(await missText('production')).toBe('nope');
  });
});

describe('I18nService.t inside an update', () => {
  it('uses the ambient locale, and an explicit locale still wins', () => {
    runAmbient(() => {
      const i18n = manager({});
      i18n.resolve(ctxWithLanguage('uk'));
      expect(i18n.t('hi', { name: 'Ann' })).toBe('Привіт, Ann!');
      expect(i18n.t('hi', { name: 'Ann' }, 'en')).toBe('Hello, Ann!');
    });
  });

  it('agrees with the free t() — both are the same implementation', () => {
    runAmbient(() => {
      const i18n = manager({});
      i18n.resolve(ctxWithLanguage('uk'));
      // Anchored, not just cross-compared: a dead rail would make both sides
      // return the key and agree vacuously.
      expect(t('hi', { name: 'Ann' })).toBe('Привіт, Ann!');
      expect(i18n.t('hi', { name: 'Ann' })).toBe('Привіт, Ann!');
      expect(t('bye')).toBe('Bye');
      expect(i18n.t('bye')).toBe('Bye');
    });
  });
});
