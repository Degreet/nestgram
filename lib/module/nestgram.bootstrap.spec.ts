import { Logger } from '@nestjs/common';

import { NestgramBootstrap } from './nestgram.bootstrap';
import { NestgramModuleOptions } from './nestgram-module.types';
import { BotService } from '../api';
import { RouteExplorer, RouteTable } from '../engine/discovery';
import { UpdateDispatcher } from '../engine/dispatcher';
import { PollingUpdateSource } from '../engine/source';

function makeBootstrap(options: Partial<NestgramModuleOptions>) {
  const getMe = jest.fn().mockResolvedValue({ username: 'mybot' });
  const start = jest.fn().mockResolvedValue(undefined);

  const bootstrap = new NestgramBootstrap(
    options as NestgramModuleOptions,
    { explore: jest.fn().mockReturnValue([]) } as unknown as RouteExplorer,
    { set: jest.fn() } as unknown as RouteTable,
    { dispatch: jest.fn() } as unknown as UpdateDispatcher,
    { start, stop: jest.fn() } as unknown as PollingUpdateSource,
    { getMe } as unknown as BotService,
  );

  return { bootstrap, getMe, start };
}

describe('NestgramBootstrap identity warming', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('warms the bot identity and starts the source under polling', async () => {
    const { bootstrap, getMe, start } = makeBootstrap({
      token: '123:abc',
      polling: true,
    });

    await bootstrap.onApplicationBootstrap();

    expect(getMe).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('does not warm identity for a webhook-only config yet (Phase 2)', async () => {
    // The webhook source isn't implemented; it will warm identity the same way
    // (extending the gate) when it lands. A webhook config alone hits no network.
    const { bootstrap, getMe, start } = makeBootstrap({
      token: '123:abc',
      webhook: { url: 'https://example.com/hook', secretToken: 's' },
    });

    await bootstrap.onApplicationBootstrap();

    expect(getMe).not.toHaveBeenCalled();
    expect(start).not.toHaveBeenCalled();
  });

  it('hits no network when no transport is configured (e.g. tests)', async () => {
    const { bootstrap, getMe, start } = makeBootstrap({ token: '123:abc' });

    await bootstrap.onApplicationBootstrap();

    expect(getMe).not.toHaveBeenCalled();
    expect(start).not.toHaveBeenCalled();
  });
});
