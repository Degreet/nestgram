import { TelegramExecutionContext } from '../engine/context';
import { defaultSessionKey } from './session-key';

function ctx(
  chat: { id: number } | undefined,
  from: { id: number } | undefined,
  update: Record<string, unknown>,
): TelegramExecutionContext {
  return { chat, from, update } as unknown as TelegramExecutionContext;
}

describe('defaultSessionKey', () => {
  it('keys a DM by chat + user (which coincide)', () => {
    const update = { message: { chat: { id: 5 }, from: { id: 5 } } };
    expect(defaultSessionKey(ctx({ id: 5 }, { id: 5 }, update))).toBe('c5:u5');
  });

  it('keeps users in a group apart', () => {
    const update = { message: { chat: { id: -100 }, from: { id: 7 } } };
    expect(defaultSessionKey(ctx({ id: -100 }, { id: 7 }, update))).toBe(
      'c-100:u7',
    );
  });

  it('scopes by forum topic when present', () => {
    const update = { message: { message_thread_id: 42 } };
    expect(defaultSessionKey(ctx({ id: -100 }, { id: 7 }, update))).toBe(
      'c-100:u7:t42',
    );
  });

  it('scopes by business connection when present', () => {
    const update = { business_message: { business_connection_id: 'biz1' } };
    expect(defaultSessionKey(ctx({ id: -100 }, { id: 7 }, update))).toBe(
      'c-100:u7:bbiz1',
    );
  });

  it('scopes a callback query by the forum topic of its message', () => {
    const update = { callback_query: { message: { message_thread_id: 42 } } };
    expect(defaultSessionKey(ctx({ id: 5 }, { id: 7 }, update))).toBe(
      'c5:u7:t42',
    );
  });

  it('returns undefined with no chat to scope to', () => {
    expect(defaultSessionKey(ctx(undefined, { id: 7 }, {}))).toBeUndefined();
  });
});
