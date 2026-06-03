import { Readable } from 'stream';

import { TelegramFile } from './telegram-file';
import { Photo } from './photo';
import { BotService } from '../../api';

interface BotFileMock {
  fileLink: jest.Mock;
  fileStream: jest.Mock;
  fileBuffer: jest.Mock;
  download: jest.Mock;
}

function botMock(): BotService & BotFileMock {
  return {
    fileLink: jest.fn(async () => 'https://api.telegram.org/file/botT/p.jpg'),
    fileStream: jest.fn(async () => Readable.from(['x'])),
    fileBuffer: jest.fn(async () => Buffer.from('x')),
    download: jest.fn(async () => undefined),
  } as unknown as BotService & BotFileMock;
}

const raw = { file_id: 'f', file_unique_id: 'u', file_size: 9 };

describe('TelegramFile delegates to BotService', () => {
  it('getLink -> bot.fileLink(file_id)', async () => {
    const bot = botMock();
    await new TelegramFile(bot, raw).getLink();
    expect(bot.fileLink).toHaveBeenCalledWith('f', { signal: undefined });
  });

  it('stream -> bot.fileStream(file_id)', async () => {
    const bot = botMock();
    await new TelegramFile(bot, raw).stream();
    expect(bot.fileStream).toHaveBeenCalledWith('f', undefined);
  });

  it('buffer -> bot.fileBuffer(file_id)', async () => {
    const bot = botMock();
    await new TelegramFile(bot, raw).buffer();
    expect(bot.fileBuffer).toHaveBeenCalledWith('f', undefined);
  });

  it('save -> bot.download(file_id, path)', async () => {
    const bot = botMock();
    await new TelegramFile(bot, raw).save('/tmp/out.bin');
    expect(bot.download).toHaveBeenCalledWith('f', '/tmp/out.bin', undefined);
  });

  it('exposes assigned metadata', () => {
    const file = new TelegramFile(botMock(), raw);
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
    const photo = new Photo(botMock(), sizes);
    expect(photo.largest.file_id).toBe('l');
    expect(photo.smallest.file_id).toBe('s');
  });

  it('save delegates to the largest size', async () => {
    const bot = botMock();
    await new Photo(bot, sizes).save('/tmp/out.bin');
    expect(bot.download).toHaveBeenCalledWith('l', '/tmp/out.bin', undefined);
  });
});
