import { BotService } from './bot.service';
import { ApiPipeline } from './request/api-pipeline';

interface FetchCall {
  url: string;
  body: Record<string, unknown>;
}

const originalFetch = global.fetch;

function mockFetch(): FetchCall[] {
  const calls: FetchCall[] = [];
  global.fetch = (async (url: string, init: { body?: string }) => {
    calls.push({ url, body: init.body ? JSON.parse(init.body) : {} });
    return { json: async () => ({ ok: true, result: true }) } as Response;
  }) as typeof fetch;
  return calls;
}

function bot(): BotService {
  return new BotService({ token: '1:T' }, new ApiPipeline(null));
}

describe('editMessageText overloads (target first, then text)', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('chat-based: (chat_id, message_id, text, options)', async () => {
    const calls = mockFetch();
    await bot().editMessageText(42, 7, 'hi', { parse_mode: 'HTML' });
    expect(calls[0].url).toContain('/editMessageText');
    expect(calls[0].body).toEqual({
      chat_id: 42,
      message_id: 7,
      text: 'hi',
      parse_mode: 'HTML',
    });
  });

  it('inline: (inline_message_id, text)', async () => {
    const calls = mockFetch();
    await bot().editMessageText('inline-1', 'hi');
    expect(calls[0].body).toEqual({
      inline_message_id: 'inline-1',
      text: 'hi',
    });
  });

  // Since Bot API 10.1 `text` is optional (rich_message can replace it), but
  // the bare-name keeps its positional slot — options-only stays available.
  it('chat-based without text: (chat_id, message_id, options)', async () => {
    const calls = mockFetch();
    await bot().editMessageText(42, 7, {
      rich_message: { markdown: '# hi' },
    });
    expect(calls[0].body).toEqual({
      chat_id: 42,
      message_id: 7,
      rich_message: { markdown: '# hi' },
    });
  });

  it('inline without text: (inline_message_id, options)', async () => {
    const calls = mockFetch();
    await bot().editMessageText('inline-1', {
      rich_message: { markdown: '# hi' },
    });
    expect(calls[0].body).toEqual({
      inline_message_id: 'inline-1',
      rich_message: { markdown: '# hi' },
    });
  });
});

describe('editMessageReplyMarkup overloads', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  const markup = { inline_keyboard: [[{ text: 'x', callback_data: 'y' }]] };

  it('chat-based: (chat_id, message_id, { reply_markup })', async () => {
    const calls = mockFetch();
    await bot().editMessageReplyMarkup(42, 7, { reply_markup: markup });
    expect(calls[0].body).toEqual({
      chat_id: 42,
      message_id: 7,
      reply_markup: markup,
    });
  });

  it('inline: (inline_message_id, { reply_markup })', async () => {
    const calls = mockFetch();
    await bot().editMessageReplyMarkup('inline-1', { reply_markup: markup });
    expect(calls[0].body).toEqual({
      inline_message_id: 'inline-1',
      reply_markup: markup,
    });
  });
});
