/**
 * Linked checkbox groups end to end: a category radio drives which tags render.
 * Two groups on one keyboard, the builder reading the category's pick via
 * `selectedIds('category')` to fetch its tags — the flagship "category → tags".
 *
 * Proves: picking a category re-renders with THAT category's tags (the builder
 * re-derives from the just-applied state), and the two groups persist their own
 * selection independently in the per-message keyboard state.
 */
import { KeyboardRender, Message, OnMessage, Router, selectedIds } from '../..';
import { InlineKeyboard } from '../../keyboards/inline-keyboard';
import { MemoryStore } from '../../store/key-value-store';
import { NestgramTestbed, updates } from '../../testing';

const CATS = ['fruit', 'veg'];
const TAGS_BY_CAT: Record<string, string[]> = {
  fruit: ['apple', 'pear'],
  veg: ['carrot'],
};

@Router()
class PickerRouter {
  static offered: string[] = [];

  @OnMessage()
  open(message: Message): Promise<unknown> {
    return message.answer('Pick', { reply_markup: this.menu() });
  }

  @KeyboardRender('category', 'tags')
  menu(): InlineKeyboard {
    const [category] = selectedIds('category'); // the picked category drives tags
    const tags = category ? TAGS_BY_CAT[category] ?? [] : [];
    PickerRouter.offered = tags;
    return new InlineKeyboard()
      .checkboxes(
        'category',
        (cb) => cb.map(CATS, (c) => cb.toggle(c, c)).split(1),
        { multi: false },
      )
      .checkboxes('tags', (cb) =>
        cb.map(tags, (t) => cb.toggle(t, t)).split(1),
      );
  }
}

describe('linked checkbox flow (booted app)', () => {
  let bot: NestgramTestbed;
  const store = new MemoryStore();
  const PICKER = 77;
  const key = `kbd:ndefault:c1000:m${PICKER}`;
  const onPicker = {
    from: { id: 5, is_bot: false, first_name: 'U' },
    messageId: PICKER,
  };

  beforeAll(async () => {
    bot = await NestgramTestbed.create({
      routers: [PickerRouter],
      keyboardState: { store },
    });
  });

  afterAll(() => bot.close());

  it('a category pick re-renders that category’s tags, both groups persist apart', async () => {
    await bot.dispatch(updates.message('hi')); // show (registers both groups)
    bot.reset();

    // Pick a category → the re-render offers THAT category's tags.
    await bot.dispatch(
      updates.callbackQuery('checkbox/category/toggle/fruit', onPicker),
    );
    expect(store.get(key)).toEqual({ 'checkbox:category': ['fruit'] });
    expect(PickerRouter.offered).toEqual(['apple', 'pear']); // category drove tags

    // Pick one of its tags → both groups now hold their own selection.
    await bot.dispatch(
      updates.callbackQuery('checkbox/tags/toggle/apple', onPicker),
    );
    expect(store.get(key)).toEqual({
      'checkbox:category': ['fruit'],
      'checkbox:tags': ['apple'],
    });
  });
});
