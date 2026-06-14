import type { RawUpdate } from '../events/raw-update.types';
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

  /** A plain text message. */
  message(text: string, overrides?: UpdateOverrides): RawUpdate {
    const id = this.resolveId(overrides);
    return {
      update_id: id,
      message: {
        message_id: overrides?.messageId ?? id,
        date: overrides?.date ?? UpdateFactory.DEFAULT_DATE,
        chat: this.chat(overrides),
        from: this.user(overrides),
        text,
      },
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
