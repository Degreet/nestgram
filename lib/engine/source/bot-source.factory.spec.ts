import { ModuleRef } from '@nestjs/core';

import { BotService } from '../../api';
import { getWebhookSourceToken } from '../../providers';
import { RouteTable } from '../discovery';
import { AllowedUpdatesResolver } from './allowed-updates.resolver';
import { BotSourceFactory } from './bot-source.factory';
import { PollingUpdateSource } from './polling-update-source';
import { WebhookUpdateSource } from './webhook-update-source';

function factory(moduleRef?: ModuleRef): BotSourceFactory {
  return new BotSourceFactory(
    new AllowedUpdatesResolver(new RouteTable([])),
    moduleRef ?? ({ get: jest.fn() } as unknown as ModuleRef),
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
});
