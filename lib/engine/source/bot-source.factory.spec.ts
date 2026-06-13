import { BotService } from '../../api';
import { RouteTable } from '../discovery';
import { AllowedUpdatesResolver } from './allowed-updates.resolver';
import { BotSourceFactory } from './bot-source.factory';
import { PollingUpdateSource } from './polling-update-source';

function factory(): BotSourceFactory {
  return new BotSourceFactory(new AllowedUpdatesResolver(new RouteTable([])));
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

  it('returns null for a webhook bot (not auto-wired) or no transport', () => {
    expect(
      factory().create(bot, { webhook: { url: 'https://x/wh' } }),
    ).toBeNull();
    expect(factory().create(bot, {})).toBeNull();
    expect(factory().create(bot, { polling: false })).toBeNull();
  });
});
