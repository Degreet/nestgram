/**
 * The full flagship: a category radio drives a SCROLLABLE, scoped tags group — a
 * paginated checkbox group. The hard part this proves: a checkbox toggle on page 2
 * keeps the group on page 2 (the pagination stage recovers the cursor from the
 * incoming markup before the toggle re-renders), and the tap persists to the
 * category-scoped key.
 */
import { getAmbient } from '../../ambient';
import { KeyboardRender, Router, selectedIds } from '../..';
import { InlineKeyboard } from '../../keyboards/inline-keyboard';
import { PAGINATION_CURSORS } from '../../keyboards/pagination.constants';
import type { RawUpdate } from '../../events/raw-update.types';
import { MemoryStore } from '../../store/key-value-store';
import { NestgramTestbed, updates } from '../../testing';

const CATS = ['fruit', 'veg'];
const TAGS_BY_CAT: Record<string, string[]> = {
  fruit: ['a', 'b', 'c', 'd', 'e', 'f'], // 6 → 3 pages at size 2
  veg: ['x'],
};

@Router()
class ShopRouter {
  static cursorSeen: number | undefined;
  static offered: string[] = [];

  @KeyboardRender('cat', 'tags')
  menu(): InlineKeyboard {
    const [cat] = selectedIds('cat');
    const tags = cat ? TAGS_BY_CAT[cat] ?? [] : [];
    ShopRouter.cursorSeen =
      getAmbient<Record<string, number>>(PAGINATION_CURSORS)?.tags;
    ShopRouter.offered = tags;
    return new InlineKeyboard()
      .checkboxes(
        'cat',
        (cb) => cb.map(CATS, (c) => cb.toggle(c, c)).split(1),
        {
          multi: false,
        },
      )
      .checkboxes(
        'tags',
        (cb) => cb.map(tags, (t) => cb.toggle(t, t)).split(1),
        {
          scope: () => selectedIds('cat')[0],
        },
      )
      .paginate('tags', { size: 2 });
  }
}

// A tag toggle on a keyboard whose tags group is on page 1 (its `pageat` counter).
function toggleTagOnPage1(): RawUpdate {
  return updates.raw({
    callback_query: {
      id: 'cb',
      from: { id: 9, is_bot: false, first_name: 'U' },
      chat_instance: 'ci',
      message: {
        message_id: 30,
        date: 1,
        chat: { id: 1000, type: 'private' },
        text: '',
        reply_markup: {
          inline_keyboard: [
            [{ text: 'C', callback_data: 'checkbox/tags/toggle/c' }],
            [
              { text: '‹', callback_data: 'pagego/tags/0' },
              { text: '2/3', callback_data: 'pageat/tags/1' }, // tags on page 1
              { text: '›', callback_data: 'pagego/tags/2' },
            ],
          ],
        },
      },
      data: 'checkbox/tags/toggle/c',
    },
  });
}

describe('paginated checkbox flow (booted app)', () => {
  let bot: NestgramTestbed;
  const store = new MemoryStore();
  const key = 'kbd:ndefault:c1000:m30';

  beforeAll(async () => {
    bot = await NestgramTestbed.create({
      routers: [ShopRouter],
      keyboardState: { store },
    });
  });

  afterAll(() => bot.close());

  it('a toggle keeps the paginated group on its page and persists to the scoped key', async () => {
    store.set(key, { 'checkbox:cat': ['fruit'] }); // a category is already chosen
    ShopRouter.cursorSeen = undefined;

    await bot.dispatch(toggleTagOnPage1());

    // The builder saw the tags group still on page 1 (recovered from the markup)…
    expect(ShopRouter.cursorSeen).toBe(1);
    expect(ShopRouter.offered).toEqual(TAGS_BY_CAT.fruit); // category drove the tags
    // …and the tap persisted to the category-scoped tags key.
    expect(store.get(key)).toEqual({
      'checkbox:cat': ['fruit'],
      'checkbox:tags:fruit': ['c'],
    });
  });
});
