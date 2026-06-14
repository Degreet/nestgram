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
  /** FSM config, provided by `FsmModule.forRoot`/`forRootAsync`. */
  FSM_OPTIONS = 'FSM_OPTIONS',
  /** Scenes config, provided by `ScenesModule.forRoot`/`forRootAsync`. */
  SCENES_OPTIONS = 'SCENES_OPTIONS',
  /**
   * The per-bot webhook sources of a multi-bot app (one per webhook bot), paired
   * with whether each is the default. The ready-made multi-bot webhook
   * controllers inject this to route an inbound POST to the right bot.
   */
  WEBHOOK_SOURCES = 'WEBHOOK_SOURCES',
}

/** The name an unnamed single bot takes — what a bare `BotService` resolves to. */
export const DEFAULT_BOT_NAME = 'default';

/**
 * The DI token a bot's `BotService` is provided under, keyed by name. `@InjectBot`
 * is sugar over `@Inject(getBotToken(name))`; a free function because it is the
 * established Nest token-helper idiom (`getRepositoryToken` and friends). Lives in
 * the tokens module so both the `api` and `module` layers reach it cycle-free.
 */
export function getBotToken(name: string = DEFAULT_BOT_NAME): string {
  return `nestgram:bot:${name}`;
}

/**
 * The DI token a bot's per-bot `WebhookUpdateSource` is provided under in a
 * multi-bot app — one instance shared between the fleet (which starts it, calling
 * `setWebhook`) and the webhook controller (which delivers received updates to
 * it). Keyed by name, mirroring {@link getBotToken}.
 */
export function getWebhookSourceToken(name: string = DEFAULT_BOT_NAME): string {
  return `nestgram:webhook-source:${name}`;
}
