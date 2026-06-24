import { BotOptions } from '../api/bot-options';
import type { PollingOptions } from '../engine/source';
import { NestgramConfigError } from '../exceptions';
import { DEFAULT_BOT_NAME } from '../providers';
import {
  BotDefinition,
  NestgramModuleOptions,
  WebhookOptions,
} from './nestgram-module.types';

/**
 * One bot after config normalization: its name, whether it is the default, its
 * transport, and the per-bot {@link BotOptions} its interceptor pipeline is built
 * from.
 */
export interface ResolvedBot {
  name: string;
  isDefault: boolean;
  polling?: boolean | PollingOptions;
  webhook?: WebhookOptions;
  options: BotOptions;
}

/**
 * Normalizes a {@link NestgramModuleOptions} into the canonical list of bots,
 * collapsing the single-bot shorthand (`token` + transport at the top level) and
 * the multi-bot `bots: []` into one shape — and rejecting an inconsistent config
 * at boot rather than letting it half-work. Pure and static: it runs at module
 * definition time, before DI exists.
 */
export class BotConfigResolver {
  static resolve(options: NestgramModuleOptions): ResolvedBot[] {
    const { bots, token } = options;
    if (bots && token !== undefined) {
      throw new NestgramConfigError(
        'Pass either `token` (single bot) or `bots: []` (multi-bot), not both.',
      );
    }

    let definitions: BotDefinition[];
    if (bots) {
      definitions = bots;
    } else if (typeof token === 'string') {
      definitions = [this.singleBotDefinition(token, options)];
    } else {
      throw new NestgramConfigError(
        'No bot configured — pass `token` for a single bot or `bots: []` for several.',
      );
    }
    if (definitions.length === 0) {
      throw new NestgramConfigError(
        '`bots: []` is empty — configure at least one bot.',
      );
    }

    const resolved = definitions.map((definition) =>
      this.resolveOne(definition),
    );
    this.assertUniqueNames(resolved);
    this.assertUniqueTokens(resolved);
    this.assertUniqueWebhookSecrets(resolved);
    return this.applyDefault(resolved);
  }

  /** The single-bot shorthand as a {@link BotDefinition} (the top-level fields). */
  private static singleBotDefinition(
    token: string,
    options: NestgramModuleOptions,
  ): BotDefinition {
    return {
      token,
      polling: options.polling,
      webhook: options.webhook,
      parseMode: options.parseMode,
      richMessages: options.richMessages,
      ignoreNotModified: options.ignoreNotModified,
      apiInterceptors: options.apiInterceptors,
      throttle: options.throttle,
      throttler: options.throttler,
      fileIdCache: options.fileIdCache,
    };
  }

  /**
   * Token CONTENT (empty / malformed) is deliberately NOT validated here — that is
   * `TokenValidationInterceptor`'s job at boot, so the message is consistent
   * whether the token came from config or the wire. This guards only the SHAPE
   * (a token must be present), defending the async path where one could be undefined.
   */
  private static resolveOne(definition: BotDefinition): ResolvedBot {
    if (typeof definition.token !== 'string') {
      const label = definition.name ? `"${definition.name}"` : '(unnamed)';
      throw new NestgramConfigError(`Bot ${label} has no token.`);
    }
    return {
      name: definition.name ?? DEFAULT_BOT_NAME,
      isDefault: definition.default === true,
      polling: definition.polling,
      webhook: definition.webhook,
      options: {
        token: definition.token,
        parseMode: definition.parseMode,
        richMessages: definition.richMessages,
        ignoreNotModified: definition.ignoreNotModified,
        apiInterceptors: definition.apiInterceptors,
        throttle: definition.throttle,
        throttler: definition.throttler,
        fileIdCache: definition.fileIdCache,
      },
    };
  }

  private static assertUniqueNames(bots: ResolvedBot[]): void {
    const seen = new Set<string>();
    for (const bot of bots) {
      if (seen.has(bot.name)) {
        const hint =
          bot.name === DEFAULT_BOT_NAME
            ? ' — give each bot a distinct `name` in a multi-bot setup'
            : '';
        throw new NestgramConfigError(
          `Duplicate bot name "${bot.name}"${hint}.`,
        );
      }
      seen.add(bot.name);
    }
  }

  private static assertUniqueTokens(bots: ResolvedBot[]): void {
    const seen = new Set<string>();
    for (const bot of bots) {
      if (seen.has(bot.options.token)) {
        throw new NestgramConfigError(
          `Two bots share a token (bot "${bot.name}") — each bot needs its own.`,
        );
      }
      seen.add(bot.options.token);
    }
  }

  /**
   * Webhook secret tokens must be distinct across bots: the shared-endpoint
   * webhook controller routes an inbound update to the bot whose secret matches,
   * so a shared secret would silently misroute (first-match wins). Only bots that
   * set a `secretToken` are checked — an absent one is a separate (insecure)
   * config the source warns about at startup.
   */
  private static assertUniqueWebhookSecrets(bots: ResolvedBot[]): void {
    const seen = new Set<string>();
    for (const bot of bots) {
      const secret = bot.webhook?.secretToken;
      if (secret === undefined) {
        continue;
      }
      if (seen.has(secret)) {
        throw new NestgramConfigError(
          `Two bots share a webhook secretToken (bot "${bot.name}") — each ` +
            'needs its own so a shared endpoint can route to the right bot.',
        );
      }
      seen.add(secret);
    }
  }

  /**
   * Settle which bot is the default — the one a bare `BotService` (and
   * `@InjectBot()` with no name) resolves to. A single bot is implicitly the
   * default. With several bots, AT MOST one may be flagged `default: true` (more
   * than one is rejected). None is allowed too — co-equal bots (e.g. white-label
   * tenants) with no primary: a bare `BotService` injection is then ambiguous and
   * unavailable, and each bot is reached only via `@InjectBot(name)` / `@Bot()`.
   * We never silently pick the first — that would make the default depend on
   * array order.
   */
  private static applyDefault(bots: ResolvedBot[]): ResolvedBot[] {
    if (bots.length === 1) {
      bots[0].isDefault = true;
      return bots;
    }
    const flagged = bots.filter((bot) => bot.isDefault);
    if (flagged.length > 1) {
      throw new NestgramConfigError(
        'More than one bot is marked `default: true` — at most one may be.',
      );
    }
    return bots;
  }
}
