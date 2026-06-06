/** DI tokens for the framework's injected configuration. */
export enum Providers {
  BOT_OPTIONS = 'BOT_OPTIONS',
  NESTGRAM_OPTIONS = 'NESTGRAM_OPTIONS',
  /** The active {@link UpdateSource} (polling or webhook), chosen by config. */
  UPDATE_SOURCE = 'UPDATE_SOURCE',
  /** The active {@link SendThrottler} (default, off, or a user override). */
  THROTTLER = 'THROTTLER',
}
