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

/** No interceptors — exercise the generated wrapper → call → send path directly. */
function bot(): BotService {
  return new BotService({ token: '1:T' }, new ApiPipeline(null));
}

describe('generated BotService methods', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('required args are positional and seed the payload; options spread over them', async () => {
    const calls = mockFetch();
    await bot().banChatMember(42, 7, { until_date: 99 });
    expect(calls[0].url).toContain('/banChatMember');
    expect(calls[0].body).toEqual({ chat_id: 42, user_id: 7, until_date: 99 });
  });

  it('a no-arg method sends an empty payload', async () => {
    const calls = mockFetch();
    await bot().close();
    expect(calls[0].url).toContain('/close');
    expect(calls[0].body).toEqual({});
  });

  it('an all-optional method takes options only', async () => {
    const calls = mockFetch();
    await bot().getMyCommands({ language_code: 'en' });
    expect(calls[0].url).toContain('/getMyCommands');
    expect(calls[0].body).toEqual({ language_code: 'en' });
  });

  it('splits token/signal out of the wire payload', async () => {
    const calls = mockFetch();
    await bot().banChatMember(42, 7, { token: '2:OTHER' });
    expect(calls[0].url).toContain('/bot2:OTHER/');
    expect('token' in calls[0].body).toBe(false);
    expect(calls[0].body).toEqual({ chat_id: 42, user_id: 7 });
  });
});
