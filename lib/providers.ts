/** DI tokens for the framework's injected configuration. */
export enum Providers {
  BOT_OPTIONS = 'BOT_OPTIONS',
  NESTGRAM_OPTIONS = 'NESTGRAM_OPTIONS',
  /** The active {@link UpdateSource} (polling or webhook), chosen by config. */
  UPDATE_SOURCE = 'UPDATE_SOURCE',
  /** i18n config, provided by `I18nModule.forRoot`/`forRootAsync`. */
  I18N_OPTIONS = 'I18N_OPTIONS',
  /** Session config, provided by `SessionModule.forRoot`/`forRootAsync`. */
  SESSION_OPTIONS = 'SESSION_OPTIONS',
}
