import { BotConfigResolver, DEFAULT_BOT_NAME, getBotToken } from './bot-config';
import { ParseMode } from '../api/parse-mode';
import { NestgramConfigError } from '../exceptions';

describe('getBotToken', () => {
  it('keys by name, defaulting to the default bot', () => {
    expect(getBotToken('sales')).toBe('nestgram:bot:sales');
    expect(getBotToken()).toBe(`nestgram:bot:${DEFAULT_BOT_NAME}`);
  });
});

describe('BotConfigResolver', () => {
  it('treats the single-bot shorthand as one default bot', () => {
    const [bot, ...rest] = BotConfigResolver.resolve({
      token: 'T',
      polling: true,
      parseMode: ParseMode.Html,
    });

    expect(rest).toHaveLength(0);
    expect(bot.name).toBe(DEFAULT_BOT_NAME);
    expect(bot.isDefault).toBe(true);
    expect(bot.polling).toBe(true);
    expect(bot.options).toMatchObject({
      token: 'T',
      parseMode: ParseMode.Html,
    });
  });

  it('resolves a bots[] list, each carrying its own flags', () => {
    const bots = BotConfigResolver.resolve({
      bots: [
        {
          name: 'support',
          token: 'A',
          polling: true,
          parseMode: ParseMode.Html,
        },
        { name: 'sales', token: 'B', webhook: { url: 'https://x/wh' } },
      ],
    });

    expect(bots.map((b) => b.name)).toEqual(['support', 'sales']);
    expect(bots[0].options.parseMode).toBe(ParseMode.Html);
    expect(bots[1].webhook).toEqual({ url: 'https://x/wh' });
    // No default flagged among several → none is the default.
    expect(bots.every((b) => !b.isDefault)).toBe(true);
  });

  it('honours an explicit default among several bots', () => {
    const bots = BotConfigResolver.resolve({
      bots: [
        { name: 'a', token: 'A' },
        { name: 'b', token: 'B', default: true },
      ],
    });

    expect(bots.find((b) => b.isDefault)?.name).toBe('b');
  });

  it('makes the sole bot the default even if it says default: false', () => {
    const [bot] = BotConfigResolver.resolve({
      bots: [{ name: 'only', token: 'A', default: false }],
    });
    expect(bot.isDefault).toBe(true);
  });

  it('rejects passing both token and bots', () => {
    expect(() =>
      BotConfigResolver.resolve({ token: 'T', bots: [{ token: 'A' }] }),
    ).toThrow(NestgramConfigError);
  });

  it('rejects an empty config', () => {
    expect(() => BotConfigResolver.resolve({})).toThrow(NestgramConfigError);
  });

  it('rejects an empty bots list', () => {
    expect(() => BotConfigResolver.resolve({ bots: [] })).toThrow(
      NestgramConfigError,
    );
  });

  it('passes an empty token through (boot-time validation, not config shape)', () => {
    // Token CONTENT is TokenValidationInterceptor's job at boot — the resolver
    // only normalizes shape, so an empty token resolves rather than throwing here.
    const [bot] = BotConfigResolver.resolve({ token: '' });
    expect(bot.options.token).toBe('');
  });

  it('rejects duplicate names (including two unnamed bots)', () => {
    expect(() =>
      BotConfigResolver.resolve({
        bots: [
          { name: 'a', token: 'A' },
          { name: 'a', token: 'B' },
        ],
      }),
    ).toThrow(/Duplicate bot name/);
    expect(() =>
      BotConfigResolver.resolve({
        bots: [{ token: 'A' }, { token: 'B' }],
      }),
    ).toThrow(/Duplicate bot name/);
  });

  it('rejects two bots sharing a token', () => {
    expect(() =>
      BotConfigResolver.resolve({
        bots: [
          { name: 'a', token: 'SAME' },
          { name: 'b', token: 'SAME' },
        ],
      }),
    ).toThrow(/share a token/);
  });

  it('rejects more than one default', () => {
    expect(() =>
      BotConfigResolver.resolve({
        bots: [
          { name: 'a', token: 'A', default: true },
          { name: 'b', token: 'B', default: true },
        ],
      }),
    ).toThrow(/more than one|at most one/i);
  });
});
