import {
  Router,
  Command,
  OnCheckboxDone,
  CheckboxIds,
  Message,
  CallbackQuery,
  User,
  Sender,
  InlineKeyboard,
} from 'nestgram';

import type { CatalogItem } from './catalog.types';

/**
 * The everyday surface, one feature per command — the place to feel each piece
 * on its own before the flagship picker (`/pick`) combines them:
 *
 * - `/topics` — a multi-select checkbox group with a Done button.
 * - `/color` — a single-select radio group (`🔘`/`⚪`).
 *
 * Neither needs a toggle handler: a tap flips the selection and re-renders in
 * place. Only Done is handled, with the picks delivered to `@CheckboxIds`.
 */
@Router()
export class BasicsRouter {
  private static readonly TOPICS: CatalogItem[] = [
    { id: 'news', label: 'News' },
    { id: 'releases', label: 'Releases' },
    { id: 'events', label: 'Events' },
    { id: 'jobs', label: 'Jobs' },
  ];

  private static readonly COLORS: CatalogItem[] = [
    { id: 'red', label: '🔴 Red' },
    { id: 'green', label: '🟢 Green' },
    { id: 'blue', label: '🔵 Blue' },
  ];

  @Command('start')
  start(message: Message, @Sender() user: User): Promise<unknown> {
    return message.answer(
      `Hey ${user.first_name}! This bot is a keyboard playground 🎛\n\n` +
        '• /topics — a multi-select checkbox group\n' +
        '• /color — a single-select radio group\n' +
        '• /pick — the flagship: linked, scoped, paginated category → tags\n\n' +
        'Tap around — every selection lives in per-message keyboard state.',
    );
  }

  @Command('topics')
  topics(message: Message): Promise<unknown> {
    return message.answer('🔔 What should I ping you about?', {
      reply_markup: new InlineKeyboard().checkboxes('topics', (cb) =>
        cb
          .map(BasicsRouter.TOPICS, (t) => cb.toggle(t.label, t.id))
          .split(2)
          .row(cb.done('✓ Done')),
      ),
    });
  }

  // Done replies with a message (not a string return, which only shows as a
  // fleeting callback toast) so the summary stays in the chat.
  @OnCheckboxDone('topics')
  topicsDone(
    query: CallbackQuery,
    @CheckboxIds('topics') ids: string[],
  ): Promise<unknown> | undefined {
    const labels = BasicsRouter.TOPICS.filter((t) => ids.includes(t.id)).map(
      (t) => t.label,
    );
    const summary = labels.length
      ? `🔔 Subscribed: ${labels.join(', ')}`
      : '🤫 Unsubscribed from everything';
    return query.message?.answer(summary);
  }

  @Command('color')
  color(message: Message): Promise<unknown> {
    return message.answer('🎨 Pick one:', {
      reply_markup: new InlineKeyboard().radio('color', (cb) =>
        cb
          .map(BasicsRouter.COLORS, (c) => cb.toggle(c.label, c.id))
          .split(3)
          .row(cb.done('✓ Done')),
      ),
    });
  }

  @OnCheckboxDone('color')
  colorDone(
    query: CallbackQuery,
    @CheckboxIds('color') ids: string[],
  ): Promise<unknown> | undefined {
    const picked = BasicsRouter.COLORS.find((c) => c.id === ids[0]);
    return query.message?.answer(
      picked ? `Your color: ${picked.label}` : 'No color picked',
    );
  }
}
