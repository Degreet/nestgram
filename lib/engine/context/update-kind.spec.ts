import { resolveKind, unmodelledKind } from './update-kind';
import { RawUpdate } from '../../events/raw-update.types';

describe('resolveKind', () => {
  it('resolves a message update', () => {
    const update: RawUpdate = {
      update_id: 1,
      message: { message_id: 1, date: 1, chat: { id: 1, type: 'private' } },
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
      edited_message: {
        message_id: 1,
        date: 1,
        chat: { id: 1, type: 'private' },
      },
    };
    expect(resolveKind(update)).toBe('edited_message');
  });

  it('resolves the non-message kinds too', () => {
    const cases: Array<keyof RawUpdate> = [
      'inline_query',
      'poll',
      'poll_answer',
      'chat_member',
      'my_chat_member',
      'pre_checkout_query',
      'shipping_query',
      'chat_join_request',
      'business_connection',
      'deleted_business_messages',
    ];
    for (const kind of cases) {
      expect(resolveKind({ update_id: 1, [kind]: {} } as RawUpdate)).toBe(kind);
    }
  });

  it('resolves a guest_message update', () => {
    const update: RawUpdate = {
      update_id: 1,
      guest_message: {
        message_id: 1,
        date: 1,
        chat: { id: 1, type: 'private' },
      },
    };
    expect(resolveKind(update)).toBe('guest_message');
  });

  it('returns null for an update with no recognised field', () => {
    const update = { update_id: 1 } as RawUpdate;
    expect(resolveKind(update)).toBeNull();
  });
});

describe('unmodelledKind', () => {
  it('names a present field newer than UpdateKind (a future Bot API type)', () => {
    const update = {
      update_id: 1,
      brand_new_thing: {},
    } as unknown as RawUpdate;
    expect(unmodelledKind(update)).toBe('brand_new_thing');
  });

  it('returns null when the update is a known kind', () => {
    const update = { update_id: 1, poll: {} } as RawUpdate;
    expect(unmodelledKind(update)).toBeNull();
  });

  it('does not flag guest_message as unmodelled (it is now routed)', () => {
    const update = { update_id: 1, guest_message: {} } as RawUpdate;
    expect(unmodelledKind(update)).toBeNull();
  });

  it('returns null for an empty update', () => {
    expect(unmodelledKind({ update_id: 1 } as RawUpdate)).toBeNull();
  });
});
