import { RawUpdate } from '../../events/raw-update.types';
import { defaultChatKey } from './chat-key';

const update = (fields: Partial<RawUpdate>): RawUpdate =>
  ({ update_id: 1, ...fields } as RawUpdate);

const withChat = (chatId: number) => ({ chat: { id: chatId } } as never);

describe('defaultChatKey', () => {
  it('keys a plain message by its chat', () => {
    expect(defaultChatKey(update({ message: withChat(42) }))).toBe('c42');
  });

  it.each([
    'edited_message',
    'channel_post',
    'edited_channel_post',
    'business_message',
    'edited_business_message',
    'guest_message',
  ] as const)('keys %s by its chat', (field) => {
    expect(defaultChatKey(update({ [field]: withChat(7) }))).toBe('c7');
  });

  it('keys a callback query by the chat of the message its button sits on', () => {
    const cb = update({
      callback_query: { message: withChat(99) } as never,
    });
    expect(defaultChatKey(cb)).toBe('c99');
  });

  it('returns undefined for an inline callback query (no message, no chat)', () => {
    const cb = update({
      callback_query: { inline_message_id: 'abc' } as never,
    });
    expect(defaultChatKey(cb)).toBeUndefined();
  });

  it.each([
    'message_reaction',
    'message_reaction_count',
    'my_chat_member',
    'chat_member',
    'chat_join_request',
    'chat_boost',
    'removed_chat_boost',
    'deleted_business_messages',
  ] as const)('keys %s by its chat', (field) => {
    expect(defaultChatKey(update({ [field]: withChat(13) }))).toBe('c13');
  });

  it.each([
    'poll',
    'poll_answer',
    'inline_query',
    'pre_checkout_query',
  ] as const)('returns undefined for the chat-less update %s', (field) => {
    expect(defaultChatKey(update({ [field]: {} as never }))).toBeUndefined();
  });

  it('keys a negative (group) chat id', () => {
    expect(defaultChatKey(update({ message: withChat(-1001234) }))).toBe(
      'c-1001234',
    );
  });
});
