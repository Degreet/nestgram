/**
 * The open action API end to end — no special decorator. A custom action is a plain
 * @Action handler that mutates the selection through the rail (setSelectedIds) and
 * returns the keyboard to re-render; the built-in cb.clear (Reset) clears a group.
 * Both land under the scoped key checkbox:tags:<category>.
 */
import {
  Action,
  KeyboardRender,
  Message,
  OnMessage,
  Router,
  selectedIds,
  setSelectedIds,
} from '../..';
import { Button } from '../../keyboards/button';
import { InlineKeyboard } from '../../keyboards/inline-keyboard';
import { MemoryStore } from '../../store/key-value-store';
import { NestgramTestbed, updates } from '../../testing';

const CATS = ['fruit'];
const TAGS_BY_CAT: Record<string, string[]> = { fruit: ['a', 'b', 'c'] };

@Router()
class PickerRouter {
  @OnMessage()
  open(message: Message): Promise<unknown> {
    return message.answer('Pick', { reply_markup: this.menu() });
  }

  @KeyboardRender('category', 'tags')
  menu(): InlineKeyboard {
    const [cat] = selectedIds('category');
    const tags = cat ? TAGS_BY_CAT[cat] ?? [] : [];
    return new InlineKeyboard()
      .radio('category', (cb) => cb.map(CATS, (c) => cb.toggle(c, c)))
      .checkboxes(
        'tags',
        (cb) =>
          cb
            .map(tags, (t) => cb.toggle(t, t))
            .split(1)
            .row(Button.text('All', 'pick/all'), cb.clear('Reset')),
        { scope: () => selectedIds('category')[0] }, // re-read: robust on a stale build
      );
  }

  // A custom action — just an @Action. Mutate via the rail, return the keyboard.
  @Action('pick/all')
  selectAll(): InlineKeyboard {
    const [cat] = selectedIds('category');
    setSelectedIds('tags', TAGS_BY_CAT[cat] ?? []);
    return this.menu();
  }
}

describe('custom action flow (booted app)', () => {
  let bot: NestgramTestbed;
  const store = new MemoryStore();
  const MSG = 40;
  const key = `kbd:ndefault:c1000:m${MSG}`;
  const onPicker = {
    from: { id: 3, is_bot: false, first_name: 'U' },
    messageId: MSG,
  };

  beforeAll(async () => {
    bot = await NestgramTestbed.create({
      routers: [PickerRouter],
      keyboardState: { store },
    });
  });

  afterAll(() => bot.close());

  it('a plain @Action selects all into the scoped key; cb.clear resets it', async () => {
    await bot.dispatch(updates.message('hi')); // show → registers the groups
    store.set(key, { 'checkbox:category': ['fruit'] }); // a category is chosen

    // The custom @Action mutates via setSelectedIds, then returns this.menu().
    await bot.dispatch(updates.callbackQuery('pick/all', onPicker));
    expect(store.get(key)).toEqual({
      'checkbox:category': ['fruit'],
      'checkbox:tags:fruit': ['a', 'b', 'c'], // scope-aware write
    });

    // cb.clear('Reset') → checkbox/tags/clear → clears the current scope's set.
    await bot.dispatch(updates.callbackQuery('checkbox/tags/clear', onPicker));
    expect(store.get(key)).toEqual({
      'checkbox:category': ['fruit'],
      'checkbox:tags:fruit': [],
    });
  });
});
