/**
 * i18n end to end through a booted app: `I18nModule.forRoot` wires I18N_OPTIONS →
 * I18nManager → I18nStage, the stage hook discovers and runs the stage before
 * matching, so `@HearsKey` routes a localized button and `t()` resolves inside
 * the handler — all via real DI + the dispatcher, no manual wiring.
 */
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';

import {
  HearsKey,
  I18nModule,
  NestgramModule,
  Router,
  t,
  UpdateDispatcher,
} from '..';
import { RawUpdate } from '../events/raw-update.types';

const translations = {
  en: { 'menu.ping': 'Ping', greeting: 'Hi {name}' },
  uk: { 'menu.ping': 'Пінг', greeting: 'Привіт {name}' },
};

@Router()
class I18nRouter {
  static log: string[] = [];

  @HearsKey('menu.ping')
  ping() {
    I18nRouter.log.push(t('greeting', { name: 'Bob' }));
  }
}

@Module({
  imports: [
    NestgramModule.forRoot({
      token: '123456:TEST',
      autoAnswerCallbackQueries: false,
    }),
    I18nModule.forRoot({ translations, defaultLocale: 'en' }),
  ],
  providers: [I18nRouter],
})
class I18nAppModule {}

function message(id: number, text: string, language_code: string): RawUpdate {
  return {
    update_id: id,
    message: {
      message_id: id,
      date: 1,
      chat: { id: 1, type: 'private' },
      from: { id: 7, is_bot: false, first_name: 'Bob', language_code },
      text,
    },
  };
}

describe('i18n via I18nModule (booted app)', () => {
  let app: INestApplicationContext;
  let dispatcher: UpdateDispatcher;

  beforeAll(async () => {
    app = await NestFactory.createApplicationContext(I18nAppModule, {
      logger: false,
    });
    dispatcher = app.get(UpdateDispatcher);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    I18nRouter.log.length = 0;
  });

  it('routes a localized button via @HearsKey and resolves t() in the handler', async () => {
    await dispatcher.dispatch(message(1, 'Пінг', 'uk'));
    expect(I18nRouter.log).toEqual(['Привіт Bob']);
  });

  it('routes the same key in another locale by that locale text', async () => {
    await dispatcher.dispatch(message(2, 'Ping', 'en'));
    expect(I18nRouter.log).toEqual(['Hi Bob']);
  });

  it('does not route when the text is not the button in the sender locale', async () => {
    await dispatcher.dispatch(message(3, 'Ping', 'uk'));
    expect(I18nRouter.log).toEqual([]);
  });
});
