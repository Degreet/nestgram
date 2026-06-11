import { Logger } from '@nestjs/common';

import { RouteTable } from '../discovery';
import { Route } from '../discovery/route.types';
import { AllowedUpdatesResolver } from './allowed-updates.resolver';

class ReminderRouter {}

function route(updateType: string, methodName = 'handle'): Route {
  return {
    updateType,
    predicates: [],
    instance: new ReminderRouter(),
    methodName,
  };
}

function make(routes: Route[]): AllowedUpdatesResolver {
  return new AllowedUpdatesResolver(new RouteTable(routes));
}

describe('AllowedUpdatesResolver', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('derives a sorted, de-duplicated list from the route table', () => {
    const resolver = make([
      route('message'),
      route('callback_query'),
      route('chat_member'),
      route('message', 'other'),
    ]);

    expect(resolver.resolve()).toEqual([
      'callback_query',
      'chat_member',
      'message',
    ]);
  });

  it('derives an empty list from an empty route table', () => {
    expect(make([]).resolve()).toEqual([]);
  });

  it('passes an explicit list through untouched', () => {
    const resolver = make([route('message')]);

    expect(resolver.resolve(['message', 'poll'])).toEqual(['message', 'poll']);
  });

  it('warns for every handler whose kind the explicit list omits', () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const resolver = make([route('message'), route('chat_member', 'onJoin')]);

    resolver.resolve(['message']);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("'chat_member'"));
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('ReminderRouter.onJoin'),
    );
  });

  it('treats an explicit empty list as the Telegram default set', () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const resolver = make([route('message'), route('chat_member', 'onJoin')]);

    // [] = Telegram's default set: message is delivered, chat_member is not.
    expect(resolver.resolve([])).toEqual([]);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("'chat_member'"));
  });

  it('does not warn when the explicit list covers every handler', () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    make([route('message')]).resolve(['message', 'callback_query']);

    expect(warn).not.toHaveBeenCalled();
  });
});
