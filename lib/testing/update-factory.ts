import type {
  RawChatMember,
  RawChatMemberUpdated,
  RawMessage,
  RawPhotoSize,
  RawUpdate,
} from '../events/raw-update.types';
import type { TestChat, TestUser, UpdateOverrides } from './testing.types';

/** The leading slash a bot command carries in message text. */
const COMMAND_PREFIX = '/';

/**
 * Builds well-formed fake {@link RawUpdate}s to feed {@link NestgramTestbed.dispatch}.
 *
 * Every builder fills in sensible defaults (a private chat, a non-bot sender, an
 * auto-incrementing `update_id`/`message_id`, a fixed `date`) so a test states
 * only what matters — `updates.message('hi')` — and overrides the rest through
 * {@link UpdateOverrides}. The shared `update_id` counter keeps successive updates
 * distinct without the test tracking ids.
 *
 * Exposed as the ready-to-use {@link updates} singleton; instantiate your own
 * `UpdateFactory` when a test needs an isolated id counter.
 */
export class UpdateFactory {
  private nextId = 1;

  private static readonly DEFAULT_USER: TestUser = {
    id: 1000,
    is_bot: false,
    first_name: 'Test',
    username: 'test_user',
    language_code: 'en',
  };

  private static readonly DEFAULT_CHAT: TestChat = {
    id: 1000,
    type: 'private',
  };

  private static readonly DEFAULT_DATE = 1_700_000_000;

  /** The chat type a channel post / edited channel post carries. */
  private static readonly CHANNEL_CHAT_TYPE: TestChat['type'] = 'channel';

  /** The currency a payment-related builder fills in by default. */
  private static readonly DEFAULT_CURRENCY = 'USD';

  /** The smallest-unit amount a payment-related builder fills in by default. */
  private static readonly DEFAULT_AMOUNT = 100;

  /** A single {@link RawPhotoSize} the `photo()` builder attaches by default. */
  private static readonly DEFAULT_PHOTO: RawPhotoSize = {
    file_id: 'test_photo_file_id',
    file_unique_id: 'test_photo_unique_id',
    width: 90,
    height: 90,
    file_size: 1234,
  };

  /** A plain text message. */
  message(text: string, overrides?: UpdateOverrides): RawUpdate {
    const id = this.resolveId(overrides);
    return {
      update_id: id,
      message: this.textMessage(text, id, this.chat(overrides), overrides),
    };
  }

  /** An edited message — the same shape as {@link message}, on `edited_message`. */
  editedMessage(text: string, overrides?: UpdateOverrides): RawUpdate {
    const id = this.resolveId(overrides);
    return {
      update_id: id,
      edited_message: this.textMessage(
        text,
        id,
        this.chat(overrides),
        overrides,
      ),
    };
  }

  /** A message from a guest (`guest_message`), when guest mode is enabled. */
  guestMessage(text: string, overrides?: UpdateOverrides): RawUpdate {
    const id = this.resolveId(overrides);
    return {
      update_id: id,
      guest_message: {
        ...this.textMessage(text, id, this.chat(overrides), overrides),
        guest_query_id: `gq_${id}`,
      },
    };
  }

  /**
   * A channel post — a message in a `channel` chat with no `from` sender (the
   * default chat type is overridden to `channel`; pass `overrides.chat` to widen).
   */
  channelPost(text: string, overrides?: UpdateOverrides): RawUpdate {
    const id = this.resolveId(overrides);
    return {
      update_id: id,
      channel_post: this.channelMessage(text, id, overrides),
    };
  }

  /** An edited channel post — like {@link channelPost}, on `edited_channel_post`. */
  editedChannelPost(text: string, overrides?: UpdateOverrides): RawUpdate {
    const id = this.resolveId(overrides);
    return {
      update_id: id,
      edited_channel_post: this.channelMessage(text, id, overrides),
    };
  }

  /**
   * A photo message — a `message` carrying a `photo` (a one-element
   * `PhotoSize[]`), the update `@OnPhoto`/`@OnMedia` match on. Pass `caption`
   * for an accompanying caption.
   */
  photo(caption?: string, overrides?: UpdateOverrides): RawUpdate {
    const id = this.resolveId(overrides);
    const message: RawMessage = {
      message_id: overrides?.messageId ?? id,
      date: overrides?.date ?? UpdateFactory.DEFAULT_DATE,
      chat: this.chat(overrides),
      from: this.user(overrides),
      photo: [UpdateFactory.DEFAULT_PHOTO],
    };
    if (caption !== undefined) {
      message.caption = caption;
    }
    return { update_id: id, message };
  }

  /** The bot's own membership changing in a chat (`my_chat_member`). */
  myChatMember(overrides?: UpdateOverrides): RawUpdate {
    const id = this.resolveId(overrides);
    return {
      update_id: id,
      my_chat_member: this.chatMemberUpdate(overrides),
    };
  }

  /** Another member's status changing in a chat (`chat_member`). */
  chatMember(overrides?: UpdateOverrides): RawUpdate {
    const id = this.resolveId(overrides);
    return {
      update_id: id,
      chat_member: this.chatMemberUpdate(overrides),
    };
  }

  /** A request to join a chat that requires approval (`chat_join_request`). */
  chatJoinRequest(overrides?: UpdateOverrides): RawUpdate {
    const id = this.resolveId(overrides);
    const chat = this.chat(overrides);
    return {
      update_id: id,
      chat_join_request: {
        chat,
        from: this.user(overrides),
        user_chat_id: chat.id,
        date: overrides?.date ?? UpdateFactory.DEFAULT_DATE,
      },
    };
  }

  /** A pre-checkout query the bot must answer before payment (`pre_checkout_query`). */
  preCheckoutQuery(payload: string, overrides?: UpdateOverrides): RawUpdate {
    const id = this.resolveId(overrides);
    return {
      update_id: id,
      pre_checkout_query: {
        id: `pcq_${id}`,
        from: this.user(overrides),
        currency: UpdateFactory.DEFAULT_CURRENCY,
        total_amount: UpdateFactory.DEFAULT_AMOUNT,
        invoice_payload: payload,
      },
    };
  }

  /** A shipping query for a flexible invoice (`shipping_query`). */
  shippingQuery(payload: string, overrides?: UpdateOverrides): RawUpdate {
    const id = this.resolveId(overrides);
    return {
      update_id: id,
      shipping_query: {
        id: `sq_${id}`,
        from: this.user(overrides),
        invoice_payload: payload,
        shipping_address: {
          country_code: 'US',
          state: 'CA',
          city: 'San Francisco',
          street_line1: '1 Market St',
          street_line2: '',
          post_code: '94105',
        },
      },
    };
  }

  /** A poll state update — anonymous polls the bot created (`poll`). */
  poll(question: string, overrides?: UpdateOverrides): RawUpdate {
    const id = this.resolveId(overrides);
    return {
      update_id: id,
      poll: {
        id: `poll_${id}`,
        question,
        options: [
          { persistent_id: 'opt_0', text: 'Yes', voter_count: 0 },
          { persistent_id: 'opt_1', text: 'No', voter_count: 0 },
        ],
        total_voter_count: 0,
        is_closed: false,
        is_anonymous: true,
        type: 'regular',
        allows_multiple_answers: false,
        allows_revoting: false,
        members_only: false,
      },
    };
  }

  /** A user's answer in a non-anonymous poll (`poll_answer`). */
  pollAnswer(optionIds: number[], overrides?: UpdateOverrides): RawUpdate {
    const id = this.resolveId(overrides);
    return {
      update_id: id,
      poll_answer: {
        poll_id: `poll_${id}`,
        user: this.user(overrides),
        option_ids: optionIds,
        option_persistent_ids: optionIds.map((index) => `opt_${index}`),
      },
    };
  }

  /** A reaction added to or removed from a message (`message_reaction`). */
  messageReaction(emoji: string, overrides?: UpdateOverrides): RawUpdate {
    const id = this.resolveId(overrides);
    return {
      update_id: id,
      message_reaction: {
        chat: this.chat(overrides),
        message_id: overrides?.messageId ?? id,
        user: this.user(overrides),
        date: overrides?.date ?? UpdateFactory.DEFAULT_DATE,
        old_reaction: [],
        new_reaction: [{ type: 'emoji', emoji }],
      },
    };
  }

  /**
   * The escape hatch: pass any hand-built update through unchanged, only filling
   * `update_id` (auto-incrementing) when absent — the typed "any kind" path for
   * update kinds without a dedicated builder.
   */
  raw(update: Partial<RawUpdate>): RawUpdate {
    return {
      ...update,
      update_id: update.update_id ?? this.nextId++,
    };
  }

  /**
   * A bot command message — `updates.command('start')` → `/start`,
   * `updates.command('start', 'ref_42')` → `/start ref_42`. The leading slash is
   * added for you; pass the command without it.
   */
  command(
    command: string,
    args?: string,
    overrides?: UpdateOverrides,
  ): RawUpdate {
    const text = args
      ? `${COMMAND_PREFIX}${command} ${args}`
      : `${COMMAND_PREFIX}${command}`;
    return this.message(text, overrides);
  }

  /** A callback query (an inline-button tap), carrying `data`. */
  callbackQuery(data: string, overrides?: UpdateOverrides): RawUpdate {
    const id = this.resolveId(overrides);
    return {
      update_id: id,
      callback_query: {
        id: `cb_${id}`,
        from: this.user(overrides),
        chat_instance: `ci_${id}`,
        message: {
          message_id: overrides?.messageId ?? id,
          date: overrides?.date ?? UpdateFactory.DEFAULT_DATE,
          chat: this.chat(overrides),
          text: '',
        },
        data,
      },
    };
  }

  /** An inline query (`@bot query` typed in any chat). */
  inlineQuery(query: string, overrides?: UpdateOverrides): RawUpdate {
    const id = this.resolveId(overrides);
    return {
      update_id: id,
      inline_query: {
        id: `iq_${id}`,
        from: this.user(overrides),
        query,
        offset: '',
      },
    };
  }

  /** A text {@link RawMessage} on a given chat — the shared body of the message builders. */
  private textMessage(
    text: string,
    id: number,
    chat: TestChat,
    overrides?: UpdateOverrides,
  ): RawMessage {
    return {
      message_id: overrides?.messageId ?? id,
      date: overrides?.date ?? UpdateFactory.DEFAULT_DATE,
      chat,
      from: this.user(overrides),
      text,
    };
  }

  /** A channel-post {@link RawMessage}: a `channel` chat, no `from` sender. */
  private channelMessage(
    text: string,
    id: number,
    overrides?: UpdateOverrides,
  ): RawMessage {
    return {
      message_id: overrides?.messageId ?? id,
      date: overrides?.date ?? UpdateFactory.DEFAULT_DATE,
      chat: {
        ...this.chat(overrides),
        type: overrides?.chat?.type ?? UpdateFactory.CHANNEL_CHAT_TYPE,
      },
      text,
    };
  }

  /** A `left` → `member` transition — the body shared by my/other chat-member updates. */
  private chatMemberUpdate(overrides?: UpdateOverrides): RawChatMemberUpdated {
    const user = this.user(overrides);
    const oldMember: RawChatMember = { status: 'left', user };
    const newMember: RawChatMember = { status: 'member', user };
    return {
      chat: this.chat(overrides),
      from: user,
      date: overrides?.date ?? UpdateFactory.DEFAULT_DATE,
      old_chat_member: oldMember,
      new_chat_member: newMember,
    };
  }

  private resolveId(overrides?: UpdateOverrides): number {
    if (overrides?.updateId !== undefined) {
      return overrides.updateId;
    }
    return this.nextId++;
  }

  private user(overrides?: UpdateOverrides): TestUser {
    return { ...UpdateFactory.DEFAULT_USER, ...overrides?.from };
  }

  private chat(overrides?: UpdateOverrides): TestChat {
    return { ...UpdateFactory.DEFAULT_CHAT, ...overrides?.chat };
  }
}

/** A shared {@link UpdateFactory} — the ergonomic `updates.message(...)` entry point. */
export const updates = new UpdateFactory();
