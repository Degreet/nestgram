/**
 * Two paginations end to end: navigating one section preserves the other's page,
 * recovered from the incoming markup's `pageat` counters — no store, no nav
 * handler. The render method records the cursor map it was handed, so the test
 * asserts the whole chain: dispatch → PaginationRouter → recover + override →
 * re-invoke the `@KeyboardRender` builder with the right per-section pages.
 */
import { getAmbient } from '../../ambient';
import { KeyboardRender, Router } from '../..';
import { Button } from '../../keyboards/button';
import { InlineKeyboard } from '../../keyboards/inline-keyboard';
import { PAGINATION_CURSORS } from '../../keyboards/pagination.constants';
import type { RawUpdate } from '../../events/raw-update.types';
import { NestgramTestbed, updates } from '../../testing';

const CATS = Array.from({ length: 6 }, (_, i) => i);
const TAGS = Array.from({ length: 8 }, (_, i) => i);

@Router()
class ShopRouter {
  static seenCursors: Record<string, number> = {};

  @KeyboardRender('cats', 'tags')
  menu(): InlineKeyboard {
    ShopRouter.seenCursors =
      getAmbient<Record<string, number>>(PAGINATION_CURSORS) ?? {};
    return new InlineKeyboard()
      .map(CATS, (c) => Button.text(`c${c}`, `cat/${c}`))
      .split(1)
      .paginate('cats', { size: 2 })
      .map(TAGS, (t) => Button.text(`t${t}`, `tag/${t}`))
      .split(1)
      .paginate('tags', { size: 2 });
  }
}

// A nav tap carrying the on-screen markup: cats currently on page 0, tags on
// page 2 (its `pageat` counter is what preserves it across the re-render).
function tapCatsNext(): RawUpdate {
  return updates.raw({
    callback_query: {
      id: 'cb1',
      from: { id: 7, is_bot: false, first_name: 'U' },
      chat_instance: 'ci',
      message: {
        message_id: 50,
        date: 1,
        chat: { id: 1, type: 'private' },
        text: '',
        reply_markup: {
          inline_keyboard: [
            [{ text: 'c0', callback_data: 'cat/0' }],
            [
              { text: '1/3', callback_data: 'pageat/cats/0' },
              { text: '›', callback_data: 'pagego/cats/1' },
            ],
            [{ text: 't4', callback_data: 'tag/4' }],
            [
              { text: '‹', callback_data: 'pagego/tags/1' },
              { text: '3/4', callback_data: 'pageat/tags/2' },
              { text: '›', callback_data: 'pagego/tags/3' },
            ],
          ],
        },
      },
      data: 'pagego/cats/1',
    },
  });
}

describe('pagination flow (booted app)', () => {
  let bot: NestgramTestbed;

  beforeAll(async () => {
    bot = await NestgramTestbed.create({ routers: [ShopRouter] });
  });

  afterAll(() => bot.close());

  it('navigates the tapped section and preserves the other from the markup', async () => {
    await bot.dispatch(tapCatsNext());

    // cats → page 1 (from the tap); tags → page 2 (recovered from the markup).
    expect(ShopRouter.seenCursors).toEqual({ cats: 1, tags: 2 });
  });
});
