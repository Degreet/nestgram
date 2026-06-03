import { existsSync } from 'fs';
import { readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { Readable } from 'stream';

import { TelegramFile } from './telegram-file';
import { Photo } from './photo';
import { BotService } from '../../api';
import { NestgramError } from '../../exceptions';

const originalFetch = global.fetch;
const CONTENT = 'IMG-BYTES';

function botStub(file_path: string | undefined): {
  bot: BotService;
  getFile: jest.Mock;
} {
  const getFile = jest.fn(async () => ({
    file_id: 'f',
    file_unique_id: 'u',
    file_path,
  }));
  const bot = { token: 'T', getFile } as unknown as BotService;
  return { bot, getFile };
}

function mockFetch(ok = true): jest.Mock {
  const fn = jest.fn(async () =>
    ok ? new Response(CONTENT) : new Response('no', { status: 404 }),
  );
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

function rawFile() {
  return { file_id: 'f', file_unique_id: 'u', file_size: 9 };
}

afterEach(() => {
  global.fetch = originalFetch;
});

describe('TelegramFile', () => {
  it('resolves a fresh download link via getFile', async () => {
    const { bot, getFile } = botStub('photos/f.jpg');
    const file = new TelegramFile(bot, rawFile());

    expect(await file.getLink()).toBe(
      'https://api.telegram.org/file/botT/photos/f.jpg',
    );
    expect(getFile).toHaveBeenCalledWith('f', { signal: undefined });
  });

  it('throws when getFile returns no file_path (e.g. too large)', async () => {
    const { bot } = botStub(undefined);
    const file = new TelegramFile(bot, rawFile());

    await expect(file.getLink()).rejects.toBeInstanceOf(NestgramError);
  });

  it('downloads the bytes into a buffer', async () => {
    const { bot } = botStub('photos/f.jpg');
    mockFetch();
    const file = new TelegramFile(bot, rawFile());

    expect((await file.buffer()).toString()).toBe(CONTENT);
  });

  it('streams the file to a local path', async () => {
    const { bot } = botStub('photos/f.jpg');
    mockFetch();
    const file = new TelegramFile(bot, rawFile());
    const dest = join(tmpdir(), `nestgram-${process.pid}-${Date.now()}.bin`);

    try {
      await file.save(dest);
      expect((await readFile(dest)).toString()).toBe(CONTENT);
    } finally {
      await rm(dest, { force: true });
    }
  });

  it('does not leave a truncated file when the stream fails mid-save', async () => {
    const { bot } = botStub('photos/f.jpg');
    const file = new TelegramFile(bot, rawFile());
    const failing = Readable.from(
      (async function* () {
        throw new Error('boom');
      })(),
    );
    jest.spyOn(file, 'download').mockResolvedValue(failing);
    const dest = join(tmpdir(), `nestgram-fail-${Date.now()}.bin`);

    try {
      await expect(file.save(dest)).rejects.toThrow('boom');
      expect(existsSync(dest)).toBe(false);
    } finally {
      await rm(dest, { force: true });
    }
  });

  it('throws on a failed download response', async () => {
    const { bot } = botStub('photos/f.jpg');
    mockFetch(false);
    const file = new TelegramFile(bot, rawFile());

    await expect(file.buffer()).rejects.toBeInstanceOf(NestgramError);
  });

  it('exposes assigned metadata', () => {
    const { bot } = botStub('photos/f.jpg');
    const file = new TelegramFile(bot, rawFile());
    expect(file.file_id).toBe('f');
    expect(file.file_size).toBe(9);
  });
});

describe('Photo', () => {
  const sizes = [
    { file_id: 's', file_unique_id: 'su', width: 90, height: 90 },
    { file_id: 'l', file_unique_id: 'lu', width: 1280, height: 1280 },
    { file_id: 'm', file_unique_id: 'mu', width: 320, height: 320 },
  ];

  it('largest / smallest pick by resolution', () => {
    const photo = new Photo({ token: 'T' } as unknown as BotService, sizes);
    expect(photo.largest.file_id).toBe('l');
    expect(photo.smallest.file_id).toBe('s');
  });

  it('save delegates to the largest size', async () => {
    const { bot } = botStub('photos/l.jpg');
    const fetchMock = mockFetch();
    const photo = new Photo(bot, sizes);
    const dest = join(tmpdir(), `nestgram-photo-${Date.now()}.bin`);

    try {
      await photo.save(dest);
      expect((await readFile(dest)).toString()).toBe(CONTENT);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      await rm(dest, { force: true });
    }
  });
});
