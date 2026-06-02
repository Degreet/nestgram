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
