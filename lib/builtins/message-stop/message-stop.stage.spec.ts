import { Logger } from '@nestjs/common';

import { MessageStopStage } from './message-stop.stage';
import { TelegramExecutionContext } from '../../engine/context';

function ctx(update: object, stopStream = jest.fn()): TelegramExecutionContext {
  return { update, bot: { stopStream } } as unknown as TelegramExecutionContext;
}

const STOP_UPDATE = {
  update_id: 1,
  stopped_message_generation: { chat: { id: -100 }, draft_id: 7 },
};

describe('MessageStopStage', () => {
  let stop: jest.Mock;
  let stage: MessageStopStage;

  beforeEach(() => {
    // The stage must reach the stream through the SAME public call it tells
    // authors to use, and take it off the context so a multi-bot app hits the
    // bot the update arrived on.
    stop = jest.fn();
    stage = new MessageStopStage();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('ignores an update that is not a stop', () => {
    stage.apply(ctx({ update_id: 1, message: { text: 'hi' } }, stop));

    expect(stop).not.toHaveBeenCalled();
  });

  it('ends the stream the stop addresses, by chat AND draft', () => {
    stop.mockReturnValue(true);

    stage.apply(ctx(STOP_UPDATE, stop));

    expect(stop).toHaveBeenCalledWith(-100, 7);
  });

  it('warns once when no stream matched, then falls back to debug', () => {
    stop.mockReturnValue(false);
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const debug = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    stage.apply(ctx(STOP_UPDATE, stop));
    stage.apply(ctx(STOP_UPDATE, stop));
    stage.apply(ctx(STOP_UPDATE, stop));

    // A repeated miss means the stops reach a process that isn't streaming —
    // say so once, loudly enough to find, without flooding a benign race.
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('bot.stopStream'),
    );
    expect(debug).toHaveBeenCalledTimes(2);
  });

  it('stays quiet while stops keep landing on real streams', () => {
    stop.mockReturnValue(true);
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    stage.apply(ctx(STOP_UPDATE, stop));

    expect(warn).not.toHaveBeenCalled();
  });
});
