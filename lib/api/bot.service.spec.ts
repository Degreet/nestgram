import { Logger } from '@nestjs/common';

import { BotService } from './bot.service';
import { BotOptions } from './bot-options';

interface FetchCall {
  url: string;
  body: Record<string, unknown>;
}

const originalFetch = global.fetch;

function mockFetch(): FetchCall[] {
  const calls: FetchCall[] = [];
  global.fetch = (async (url: string, init: { body?: string }) => {
    calls.push({ url, body: init.body ? JSON.parse(init.body) : {} });
    return { json: async () => ({ ok: true, result: {} }) } as Response;
  }) as typeof fetch;
  return calls;
}

function bot(options: BotOptions): BotService {
  return new BotService(options);
}

describe('BotService default parse mode', () => {
  let calls: FetchCall[];

  beforeEach(() => {
    calls = mockFetch();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('applies the default parse_mode when a send omits it', async () => {
    await bot({ token: 'T', parseMode: 'HTML' }).sendMessage(1, 'hi');
    expect(calls[0].body.parse_mode).toBe('HTML');
  });

  it('lets a call override the default', async () => {
    await bot({ token: 'T', parseMode: 'HTML' }).sendMessage(1, 'hi', {
      parse_mode: 'MarkdownV2',
    });
    expect(calls[0].body.parse_mode).toBe('MarkdownV2');
  });

  it('opts a call out with an explicit undefined parse_mode', async () => {
    await bot({ token: 'T', parseMode: 'HTML' }).sendMessage(1, 'hi', {
      parse_mode: undefined,
    });
    expect(calls[0].body.parse_mode).toBeUndefined();
  });

  it('sends no parse_mode when no default is configured', async () => {
    await bot({ token: 'T' }).sendMessage(1, 'hi');
    expect(calls[0].body.parse_mode).toBeUndefined();
  });
});

describe('BotService parse_mode + entities', () => {
  let calls: FetchCall[];

  beforeEach(() => {
    calls = mockFetch();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const entities = [{ type: 'bold', offset: 0, length: 2 }];

  it('does not inject the default parse_mode when entities are supplied', async () => {
    await bot({ token: 'T', parseMode: 'HTML' }).sendMessage(1, 'hi', {
      entities,
    });
    expect(calls[0].body.parse_mode).toBeUndefined();
    expect(calls[0].body.entities).toEqual(entities);
  });

  it('does not inject the default when caption_entities are supplied', async () => {
    await bot({ token: 'T', parseMode: 'HTML' }).sendPhoto(1, 'file_id', {
      caption: 'hi',
      caption_entities: entities,
    });
    expect(calls[0].body.parse_mode).toBeUndefined();
  });

  it('warns when a call supplies both parse_mode and entities', async () => {
    const warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);

    await bot({ token: 'T' }).sendMessage(1, 'hi', {
      parse_mode: 'HTML',
      entities,
    });

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('parse_mode'));
    warn.mockRestore();
  });

  it('does not warn when only entities are supplied', async () => {
    const warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);

    await bot({ token: 'T', parseMode: 'HTML' }).sendMessage(1, 'hi', {
      entities,
    });

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
