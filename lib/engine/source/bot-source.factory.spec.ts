import { ModuleRef } from '@nestjs/core';

import { BotService } from '../../api';
import { getWebhookSourceToken } from '../../providers';
import type { NestgramModuleOptions } from '../../module/nestgram-module.types';
import { RouteTable } from '../discovery';
import { AllowedUpdatesResolver } from './allowed-updates.resolver';
import { BotSourceFactory } from './bot-source.factory';
import { PollingUpdateSource } from './polling-update-source';
import { UpdateSource } from './update-source';
import { WebhookUpdateSource } from './webhook-update-source';

function factory(
  moduleRef?: ModuleRef,
  options: NestgramModuleOptions = {},
): BotSourceFactory {
  return new BotSourceFactory(
    new AllowedUpdatesResolver(new RouteTable([])),
    moduleRef ?? ({ get: jest.fn() } as unknown as ModuleRef),
    options,
  );
}

const bot = { token: 't' } as unknown as BotService;

describe('BotSourceFactory', () => {
  it('builds a PollingUpdateSource for a polling transport', () => {
    expect(factory().create(bot, { polling: true })).toBeInstanceOf(
      PollingUpdateSource,
    );
    expect(factory().create(bot, { polling: { idleMs: 5 } })).toBeInstanceOf(
      PollingUpdateSource,
    );
  });

  it('resolves the per-bot WebhookUpdateSource from DI for a webhook bot', () => {
    const webhookSource = {} as WebhookUpdateSource;
    const get = jest.fn().mockReturnValue(webhookSource);
    const moduleRef = { get } as unknown as ModuleRef;

    const source = factory(moduleRef).create(
      bot,
      { webhook: { url: 'https://x/wh' } },
      'sales',
    );

    expect(source).toBe(webhookSource);
    expect(get).toHaveBeenCalledWith(getWebhookSourceToken('sales'), {
      strict: false,
    });
  });

  it('returns null when no transport is configured', () => {
    expect(factory().create(bot, {})).toBeNull();
    expect(factory().create(bot, { polling: false })).toBeNull();
  });

  describe('user source factory', () => {
    it('hands the built-in source to the factory to wrap, and uses the result', () => {
      const wrapped = { start: jest.fn(), stop: jest.fn() } as UpdateSource;
      const source = jest.fn().mockReturnValue(wrapped);

      const result = factory(undefined, { source }).create(bot, {
        polling: true,
      });

      expect(result).toBe(wrapped);
      const ctx = source.mock.calls[0][0];
      expect(ctx.default).toBeInstanceOf(PollingUpdateSource);
      expect(ctx.bot).toBe(bot);
      expect(typeof ctx.get).toBe('function');
    });

    it('lets the factory replace ingestion entirely (no transport → default undefined)', () => {
      const custom = { start: jest.fn(), stop: jest.fn() } as UpdateSource;
      const source = jest.fn().mockReturnValue(custom);

      const result = factory(undefined, { source }).create(bot, {});

      expect(result).toBe(custom);
      expect(source.mock.calls[0][0].default).toBeUndefined();
    });

    it('exposes DI lookup to the factory via ctx.get', () => {
      const dep = { hi: true };
      const get = jest.fn().mockReturnValue(dep);
      const moduleRef = { get } as unknown as ModuleRef;
      const source = jest.fn().mockReturnValue({
        start: jest.fn(),
        stop: jest.fn(),
      } as UpdateSource);

      factory(moduleRef, { source }).create(bot, { polling: true });

      const resolved = source.mock.calls[0][0].get('SomeToken');
      expect(resolved).toBe(dep);
      expect(get).toHaveBeenCalledWith('SomeToken', { strict: false });
    });
  });
});
