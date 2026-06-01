import { resolveKind } from './update-kind';
import { RawUpdate } from '../../types/raw-update.types';

describe('resolveKind', () => {
  it('resolves a message update', () => {
    const update: RawUpdate = {
      update_id: 1,
      message: { message_id: 1, chat: { id: 1, type: 'private' } },
    };
    expect(resolveKind(update)).toBe('message');
  });

  it('resolves a callback_query update', () => {
    const update: RawUpdate = {
      update_id: 1,
      callback_query: {
        id: 'q',
        from: { id: 1, is_bot: false, first_name: 'A' },
        chat_instance: 'c',
        data: 'x',
      },
    };
    expect(resolveKind(update)).toBe('callback_query');
  });

  it('resolves an edited_message update', () => {
    const update: RawUpdate = {
      update_id: 1,
      edited_message: { message_id: 1, chat: { id: 1, type: 'private' } },
    };
    expect(resolveKind(update)).toBe('edited_message');
  });

  it('returns null for an update with no recognised field', () => {
    const update = { update_id: 1 } as RawUpdate;
    expect(resolveKind(update)).toBeNull();
  });
});
