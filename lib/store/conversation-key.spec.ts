import { TelegramExecutionContext } from '../engine/context';
import { defaultConversationKey } from './conversation-key';

function ctx(
  chat: { id: number } | undefined,
  from: { id: number } | undefined,
  update: Record<string, unknown>,
  botName?: string,
): TelegramExecutionContext {
  const bot = botName ? { name: botName } : undefined;
  return { chat, from, update, bot } as unknown as TelegramExecutionContext;
}

describe('defaultConversationKey', () => {
  it('keys a DM by chat + user (which coincide)', () => {
    const update = { message: { chat: { id: 5 }, from: { id: 5 } } };
    expect(defaultConversationKey(ctx({ id: 5 }, { id: 5 }, update))).toBe(
      'c5:u5',
    );
  });

  it('keeps users in a group apart', () => {
    const update = { message: { chat: { id: -100 }, from: { id: 7 } } };
    expect(defaultConversationKey(ctx({ id: -100 }, { id: 7 }, update))).toBe(
      'c-100:u7',
    );
  });

  it('scopes by forum topic when present', () => {
    const update = { message: { message_thread_id: 42 } };
    expect(defaultConversationKey(ctx({ id: -100 }, { id: 7 }, update))).toBe(
      'c-100:u7:t42',
    );
  });

  it('scopes by business connection when present', () => {
    const update = { business_message: { business_connection_id: 'biz1' } };
    expect(defaultConversationKey(ctx({ id: -100 }, { id: 7 }, update))).toBe(
      'c-100:u7:bbiz1',
    );
  });

  it('scopes a callback query by the forum topic of its message', () => {
    const update = { callback_query: { message: { message_thread_id: 42 } } };
    expect(defaultConversationKey(ctx({ id: 5 }, { id: 7 }, update))).toBe(
      'c5:u7:t42',
    );
  });

  it('returns undefined with no chat to scope to', () => {
    expect(
      defaultConversationKey(ctx(undefined, { id: 7 }, {})),
    ).toBeUndefined();
  });

  it('scopes by the bot (outermost) so two bots never share state', () => {
    const update = { message: { chat: { id: 5 }, from: { id: 5 } } };
    const onSupport = defaultConversationKey(
      ctx({ id: 5 }, { id: 5 }, update, 'support'),
    );
    const onSales = defaultConversationKey(
      ctx({ id: 5 }, { id: 5 }, update, 'sales'),
    );

    expect(onSupport).toBe('nsupport:c5:u5');
    expect(onSales).toBe('nsales:c5:u5');
    expect(onSupport).not.toBe(onSales);
  });
});
