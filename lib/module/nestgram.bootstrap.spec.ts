import { Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { NestgramBootstrap } from './nestgram.bootstrap';
import { NestgramModuleOptions } from './nestgram-module.types';
import { BotService } from '../api';
import {
  RouteExplorer,
  RouteTable,
  RouteTransformExplorer,
} from '../engine/discovery';
import {
  StageExplorer,
  StageRegistry,
  UpdateDispatcher,
} from '../engine/dispatcher';
import { BotSourceFactory, UpdateSource } from '../engine/source';

function makeBootstrap(options: Partial<NestgramModuleOptions>) {
  const getMe = jest.fn().mockResolvedValue({ username: 'mybot' });
  const start = jest.fn().mockResolvedValue(undefined);

  const bootstrap = new NestgramBootstrap(
    options as NestgramModuleOptions,
    { explore: jest.fn().mockReturnValue([]) } as unknown as RouteExplorer,
    {
      explore: jest.fn().mockReturnValue([]),
    } as unknown as RouteTransformExplorer,
    { set: jest.fn() } as unknown as RouteTable,
    { explore: jest.fn().mockReturnValue([]) } as unknown as StageExplorer,
    { set: jest.fn() } as unknown as StageRegistry,
    { dispatch: jest.fn() } as unknown as UpdateDispatcher,
    { start, stop: jest.fn() } as unknown as UpdateSource,
    { getMe } as unknown as BotService,
    { get: jest.fn() } as unknown as ModuleRef,
    { create: jest.fn().mockReturnValue(null) } as unknown as BotSourceFactory,
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

  it('warms identity and starts the source for a webhook config', async () => {
    const { bootstrap, getMe, start } = makeBootstrap({
      token: '123:abc',
      webhook: { url: 'https://example.com/hook', secretToken: 's' },
    });

    await bootstrap.onApplicationBootstrap();

    expect(getMe).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('hits no network when no transport is configured (e.g. tests)', async () => {
    const { bootstrap, getMe, start } = makeBootstrap({ token: '123:abc' });

    await bootstrap.onApplicationBootstrap();

    expect(getMe).not.toHaveBeenCalled();
    expect(start).not.toHaveBeenCalled();
  });
});
