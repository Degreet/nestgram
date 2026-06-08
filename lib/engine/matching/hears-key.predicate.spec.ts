import { runAmbient } from '../../ambient';
import { FlatTranslatorBackend, I18nManager } from '../../i18n';
import { TelegramExecutionContext } from '../context';
import { HearsKeyPredicate } from './hears-key.predicate';

const TRANSLATIONS = {
  en: { 'menu.remind': '➕ Remind' },
  uk: { 'menu.remind': '➕ Нагадати' },
};

function manager(): I18nManager {
  return new I18nManager({
    backend: new FlatTranslatorBackend(TRANSLATIONS),
    defaultLocale: 'en',
  });
}

function ctx(text: string, language_code: string): TelegramExecutionContext {
  return {
    update: { message: { text } },
    from: { language_code },
  } as unknown as TelegramExecutionContext;
}

describe('HearsKeyPredicate', () => {
  const predicate = new HearsKeyPredicate('menu.remind');

  it('matches text equal to the key translated in the sender locale', () => {
    runAmbient(() => {
      const uk = ctx('➕ Нагадати', 'uk');
      manager().resolve(uk);
      expect(predicate.matches(uk)).toBe(true);
    });

    runAmbient(() => {
      const en = ctx('➕ Remind', 'en');
      manager().resolve(en);
      expect(predicate.matches(en)).toBe(true);
    });
  });

  it('does not match a different string, or the same text in another locale', () => {
    runAmbient(() => {
      const uk = ctx('➕ Remind', 'uk'); // English label, Ukrainian locale
      manager().resolve(uk);
      expect(predicate.matches(uk)).toBe(false);
    });

    runAmbient(() => {
      const en = ctx('anything else', 'en');
      manager().resolve(en);
      expect(predicate.matches(en)).toBe(false);
    });
  });
});
