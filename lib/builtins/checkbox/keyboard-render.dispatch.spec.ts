/**
 * `@KeyboardRender` end to end: a tap re-invokes the developer's builder fresh, so
 * the WHOLE keyboard — not just the tapped checkbox — re-derives from current
 * state on re-render. This is what a held instance (the inline-registry fallback)
 * cannot do: its surrounding rows are frozen at show time.
 *
 * The builder reads a mutable `ui.banner` into a plain (non-checkbox) row; we flip
 * it between show and tap, and assert the in-place edit carries the new banner —
 * proving the framework rebuilt the whole keyboard, not re-rendered a stale one.
 */
import { Command, KeyboardRender, Message, Router } from '../..';
import { Button } from '../../keyboards/button';
import { InlineKeyboard } from '../../keyboards/inline-keyboard';
import { EditMessageReplyMarkup } from '../../api/methods';
import { MemoryStore } from '../../store/key-value-store';
import { NestgramTestbed, updates } from '../../testing';

const ui = { banner: 'A' }; // mutated by the test between show and tap

@Router()
class DynRouter {
  static rendered = 0;

  @Command('show')
  show(message: Message): Promise<unknown> {
    return message.answer('Pick', { reply_markup: this.menu() });
  }

  @KeyboardRender('dyn')
  menu(): InlineKeyboard {
    DynRouter.rendered += 1;
    return new InlineKeyboard()
      .row(Button.text(ui.banner, 'noop')) // plain row, not part of the group
      .checkboxes('dyn', (cb) =>
        cb.map([{ id: 'a', name: 'Alpha' }], (t) => cb.toggle(t.name, t.id)),
      );
  }
}

const markup = (kb: unknown): { text: string }[][] =>
  (kb as InlineKeyboard).toJSON().inline_keyboard as { text: string }[][];

describe('@KeyboardRender flow (booted app)', () => {
  let bot: NestgramTestbed;
  const store = new MemoryStore();

  beforeAll(async () => {
    bot = await NestgramTestbed.create({
      routers: [DynRouter],
      keyboardState: { store },
    });
  });

  afterAll(() => bot.close());

  beforeEach(() => {
    bot.reset();
    DynRouter.rendered = 0;
    ui.banner = 'A';
  });

  it('re-invokes the builder on a tap, so the whole keyboard reflects current state', async () => {
    await bot.dispatch(updates.command('show')); // renders once
    expect(DynRouter.rendered).toBe(1);

    ui.banner = 'B'; // change a non-checkbox part of the keyboard
    await bot.dispatch(
      updates.callbackQuery('checkbox/dyn/toggle/a', { messageId: 500 }),
    );

    // The builder ran again for the re-render, not a frozen instance (a tap
    // rebuilds twice: once to apply the change, once to re-render the new state).
    expect(DynRouter.rendered).toBe(3);
    // …and the in-place edit carries the rebuilt banner, B.
    const edit = bot.calls(EditMessageReplyMarkup).at(-1);
    expect(markup(edit?.payload.reply_markup)[0][0].text).toBe('B');
    // The tap still persisted to per-message keyboard state.
    expect(store.get('kbd:ndefault:c1000:m500')).toEqual({
      'checkbox:dyn': ['a'],
    });
  });
});
