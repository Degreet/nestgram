import { Logger } from '@nestjs/common';

import { RouteTable } from '../discovery';
import { Route } from '../discovery/route.types';
import { StageRegistry } from '../dispatcher/stage-registry';
import { UpdateStage } from '../dispatcher/update-stage';
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

/** A stage that declares it consumes `stopped_message_generation`. */
@UpdateStage({ kinds: ['stopped_message_generation'] })
class StopStage {
  applied = 0;

  apply(): void {
    this.applied += 1;
  }
}

function make(
  routes: Route[],
  stages: object[] = [new StopStage()],
): AllowedUpdatesResolver {
  return new AllowedUpdatesResolver(
    new RouteTable(routes),
    new StageRegistry(stages as never[]),
  );
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
      // Always requested: consumed by a stage, so no route reveals it.
      'stopped_message_generation',
    ]);
  });

  it('still requests the stage-consumed kinds from an empty route table', () => {
    expect(make([]).resolve()).toEqual(['stopped_message_generation']);
  });

  it('requests nothing extra when no stage declares a kind', () => {
    expect(make([route('message')], []).resolve()).toEqual(['message']);
  });

  it('warns that an explicit list omitting a stage kind silences the feature', () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    make([route('message')]).resolve(['message']);

    // No handler to name — the feature behind the stage is what goes quiet.
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('stopped_message_generation'),
    );
    warn.mockRestore();
  });

  it('stays quiet when the explicit list covers the stage kind', () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    make([route('message')]).resolve(['message', 'stopped_message_generation']);

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('passes an explicit list through untouched', () => {
    const resolver = make([route('message')]);

    expect(resolver.resolve(['message', 'poll'])).toEqual(['message', 'poll']);
  });

  it('warns for every handler whose kind the explicit list omits', () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const resolver = make(
      [route('message'), route('chat_member', 'onJoin')],
      [],
    );

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

    make([route('message')], []).resolve(['message', 'callback_query']);

    expect(warn).not.toHaveBeenCalled();
  });
});
