import { Logger } from '@nestjs/common';

import { BotService } from './bot.service';
import { BotOptions } from './bot-options';
import { RequestPipeline } from './request/request-pipeline';
import { DefaultParseModeTransformer } from './request/default-parse-mode.transformer';

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

// Wire the real default-parse-mode transformer so these exercise the whole
// call -> pipeline -> serialize path, not just BotService in isolation.
function bot(options: BotOptions): BotService {
  const pipeline = new RequestPipeline([
    new DefaultParseModeTransformer(options),
  ]);
  return new BotService(options, pipeline);
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

  it('targets the right URL with the bot token', async () => {
    await bot({ token: 'T' }).sendMessage(1, 'hi');
    expect(calls[0].url).toBe('https://api.telegram.org/botT/sendMessage');
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

describe('BotService per-call token override', () => {
  let calls: FetchCall[];

  beforeEach(() => {
    calls = mockFetch();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('sends against the override token without leaking it into the payload', async () => {
    await bot({ token: 'DEFAULT' }).sendMessage(1, 'hi', { token: 'OTHER' });

    expect(calls[0].url).toBe('https://api.telegram.org/botOTHER/sendMessage');
    expect('token' in calls[0].body).toBe(false);
  });

  it('falls back to the configured token when none is given', async () => {
    await bot({ token: 'DEFAULT' }).sendMessage(1, 'hi');
    expect(calls[0].url).toBe(
      'https://api.telegram.org/botDEFAULT/sendMessage',
    );
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
