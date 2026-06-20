/**
 * Linked checkbox groups end to end: a category radio drives which tags render,
 * and the tags group is `scope`d by the category — so each category keeps its own
 * tag picks and switching never mixes them. The flagship "category → tags".
 *
 * Proves: picking a category re-renders with THAT category's tags (the builder
 * re-derives from the just-applied state), the groups persist apart, and the
 * scoped selection isolates per category — switching away and back restores it.
 */
import {
  CheckboxIds,
  KeyboardRender,
  Message,
  OnCheckboxDone,
  OnMessage,
  Router,
  selectedIds,
} from '../..';
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
  static done: string[] = [];

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
      .checkboxes(
        'tags',
        (cb) =>
          cb
            .map(tags, (t) => cb.toggle(t, t))
            .split(1)
            .row(cb.done('ok')),
        { scope: () => selectedIds('category')[0] }, // a separate set per category
      );
  }

  @OnCheckboxDone('tags')
  finish(@CheckboxIds('tags') tags: string[]): void {
    PickerRouter.done = [...tags].sort();
  }
}

describe('linked checkbox flow (booted app)', () => {
  let bot: NestgramTestbed;
  const store = new MemoryStore();
  const stateKey = (msg: number): string => `kbd:ndefault:c1000:m${msg}`;
  const on = (msg: number) => ({
    from: { id: 5, is_bot: false, first_name: 'U' },
    messageId: msg,
  });

  beforeAll(async () => {
    bot = await NestgramTestbed.create({
      routers: [PickerRouter],
      keyboardState: { store },
    });
  });

  afterAll(() => bot.close());

  it('a category pick re-renders that category’s tags, scoped per category', async () => {
    await bot.dispatch(updates.message('hi')); // show (registers both groups)
    bot.reset();

    await bot.dispatch(
      updates.callbackQuery('checkbox/category/toggle/fruit', on(77)),
    );
    expect(PickerRouter.offered).toEqual(['apple', 'pear']); // category drove tags

    await bot.dispatch(
      updates.callbackQuery('checkbox/tags/toggle/apple', on(77)),
    );
    expect(store.get(stateKey(77))).toEqual({
      'checkbox:category': ['fruit'],
      'checkbox:tags:fruit': ['apple'], // scoped by category
    });
  });

  it('isolates tag picks per category and restores them on switch-back', async () => {
    await bot.dispatch(updates.message('hi', on(88)));

    // fruit → apple
    await bot.dispatch(
      updates.callbackQuery('checkbox/category/toggle/fruit', on(88)),
    );
    await bot.dispatch(
      updates.callbackQuery('checkbox/tags/toggle/apple', on(88)),
    );
    // switch to veg → carrot
    await bot.dispatch(
      updates.callbackQuery('checkbox/category/toggle/veg', on(88)),
    );
    await bot.dispatch(
      updates.callbackQuery('checkbox/tags/toggle/carrot', on(88)),
    );

    // The two categories' tag picks live side by side, never mixed.
    expect(store.get(stateKey(88))).toEqual({
      'checkbox:category': ['veg'],
      'checkbox:tags:fruit': ['apple'],
      'checkbox:tags:veg': ['carrot'],
    });

    // Done while on veg → only veg's pick.
    await bot.dispatch(updates.callbackQuery('checkbox/tags/done', on(88)));
    expect(PickerRouter.done).toEqual(['carrot']);

    // Switch back to fruit → its pick is restored.
    await bot.dispatch(
      updates.callbackQuery('checkbox/category/toggle/fruit', on(88)),
    );
    await bot.dispatch(updates.callbackQuery('checkbox/tags/done', on(88)));
    expect(PickerRouter.done).toEqual(['apple']);
  });
});
