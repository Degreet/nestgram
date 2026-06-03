import { existsSync } from 'fs';
import { readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { Readable } from 'stream';

import { Logger } from '@nestjs/common';

import { BotService } from './bot.service';
import { BotOptions } from './bot-options';
import { RequestPipeline } from './request/request-pipeline';
import { DefaultParseModeTransformer } from './request/default-parse-mode.transformer';
import { NestgramError } from '../exceptions';

interface FetchCall {
  url: string;
  body: Record<string, unknown>;
  signal?: AbortSignal;
}

const originalFetch = global.fetch;

function mockFetch(): FetchCall[] {
  const calls: FetchCall[] = [];
  global.fetch = (async (
    url: string,
    init: { body?: string; signal?: AbortSignal },
  ) => {
    calls.push({
      url,
      body: init.body ? JSON.parse(init.body) : {},
      signal: init.signal,
    });
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

describe('BotService per-call abort signal', () => {
  let calls: FetchCall[];

  beforeEach(() => {
    calls = mockFetch();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('threads an abort signal through to fetch without leaking it', async () => {
    const controller = new AbortController();
    await bot({ token: 'T' }).sendMessage(1, 'hi', {
      signal: controller.signal,
    });

    expect(calls[0].signal).toBe(controller.signal);
    expect('signal' in calls[0].body).toBe(false);
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

describe('BotService identity & deepLink', () => {
  let getMeCalls: number;

  beforeEach(() => {
    getMeCalls = 0;
    global.fetch = (async (url: string) => {
      if (url.endsWith('/getMe')) {
        getMeCalls += 1;
      }
      return {
        json: async () => ({
          ok: true,
          result: { id: 1, is_bot: true, first_name: 'Bot', username: 'mybot' },
        }),
      } as Response;
    }) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('caches the bot identity: a second getMe makes no extra request', async () => {
    const b = bot({ token: 'T' });

    const first = await b.getMe();
    const second = await b.getMe();

    expect(first.username).toBe('mybot');
    expect(second).toBe(first);
    expect(getMeCalls).toBe(1);
  });

  it('queries live for a custom token (never cached)', async () => {
    const b = bot({ token: 'T' });

    await b.getMe();
    await b.getMe({ token: 'OTHER' });

    expect(getMeCalls).toBe(2);
  });

  it('builds a deep link to the bot without a hard-coded username', async () => {
    const b = bot({ token: 'T' });
    await b.getMe(); // the launch health check warms the identity

    expect(b.deepLink({ start: 'ref_42' })).toBe(
      'https://t.me/mybot?start=ref_42',
    );
    expect(b.username).toBe('mybot');
  });

  it('throws a clear error if the identity is not loaded yet', () => {
    const b = bot({ token: 'T' });
    expect(() => b.deepLink({ start: 'x' })).toThrow(NestgramError);
  });
});

describe('BotService file download', () => {
  const FILE_PATH = 'photos/f.jpg';
  const CONTENT = 'IMG-BYTES';

  /** Mock getFile (-> file_path) and the file CDN fetch (-> bytes). */
  function mockFileFetch(fileOk = true): void {
    global.fetch = (async (url: string) => {
      if (url.endsWith('/getFile')) {
        return {
          json: async () => ({
            ok: true,
            result: { file_id: 'f', file_unique_id: 'u', file_path: FILE_PATH },
          }),
        } as Response;
      }
      return fileOk
        ? new Response(CONTENT)
        : new Response('no', { status: 404 });
    }) as typeof fetch;
  }

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('fileLink resolves a fresh URL via getFile', async () => {
    mockFileFetch();
    expect(await bot({ token: 'T' }).fileLink('f')).toBe(
      'https://api.telegram.org/file/botT/photos/f.jpg',
    );
  });

  it('fileBuffer downloads the bytes', async () => {
    mockFileFetch();
    expect((await bot({ token: 'T' }).fileBuffer('f')).toString()).toBe(
      CONTENT,
    );
  });

  it('re-resolves the link every call (file_path is temporary)', async () => {
    let getFileCalls = 0;
    global.fetch = (async (url: string) => {
      if (url.endsWith('/getFile')) {
        getFileCalls += 1;
        return {
          json: async () => ({
            ok: true,
            result: { file_id: 'f', file_unique_id: 'u', file_path: FILE_PATH },
          }),
        } as Response;
      }
      return new Response(CONTENT);
    }) as typeof fetch;

    const b = bot({ token: 'T' });
    await b.fileLink('f');
    await b.fileLink('f');
    expect(getFileCalls).toBe(2);
  });

  it('download streams the file to a local path', async () => {
    mockFileFetch();
    const dest = join(
      tmpdir(),
      `nestgram-bot-${process.pid}-${Date.now()}.bin`,
    );
    try {
      await bot({ token: 'T' }).download('f', dest);
      expect((await readFile(dest)).toString()).toBe(CONTENT);
    } finally {
      await rm(dest, { force: true });
    }
  });

  it('throws when getFile returns no file_path (e.g. too large)', async () => {
    global.fetch = (async (url: string) =>
      url.endsWith('/getFile')
        ? ({
            json: async () => ({
              ok: true,
              result: { file_id: 'f', file_unique_id: 'u' },
            }),
          } as Response)
        : new Response(CONTENT)) as typeof fetch;

    await expect(bot({ token: 'T' }).fileLink('f')).rejects.toBeInstanceOf(
      NestgramError,
    );
  });

  it('throws on a failed download response', async () => {
    mockFileFetch(false);
    await expect(bot({ token: 'T' }).fileBuffer('f')).rejects.toBeInstanceOf(
      NestgramError,
    );
  });

  it('does not leave a truncated file when the stream fails mid-save', async () => {
    const b = bot({ token: 'T' });
    jest.spyOn(b, 'fileStream').mockResolvedValue(
      Readable.from(
        (async function* () {
          throw new Error('boom');
        })(),
      ),
    );
    const dest = join(tmpdir(), `nestgram-bot-fail-${Date.now()}.bin`);
    try {
      await expect(b.download('f', dest)).rejects.toThrow('boom');
      expect(existsSync(dest)).toBe(false);
    } finally {
      await rm(dest, { force: true });
    }
  });
});
